import json
import os
import socket
import struct
import hashlib
import urllib.parse


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
}

def _json(body, status=200):
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps(body, ensure_ascii=False)}

def _esc(s):
    return str(s).replace("'", "''").replace("\\", "\\\\")

def _parse_db_url():
    url = os.environ.get("DATABASE_URL", "")
    p = urllib.parse.urlparse(url)
    schema = os.environ.get("MAIN_DB_SCHEMA", "public")
    return p.hostname or "localhost", p.port or 5432, p.username or "postgres", \
           urllib.parse.unquote(p.password or ""), (p.path or "/postgres").lstrip("/"), schema

def _pg(host, port, user, password, database, schema, sql):
    """Минимальный PostgreSQL Simple Query Protocol поверх TCP."""
    sock = socket.create_connection((host, int(port)), timeout=15)

    # StartupMessage
    params = f"user\x00{user}\x00database\x00{database}\x00options\x00-c search_path={schema},public\x00\x00"
    params_b = params.encode("utf-8")
    sock.sendall(struct.pack(">II", len(params_b) + 8, 196608) + params_b)

    # Аутентификация
    def recv_until_ready():
        buf = b""
        while b"Z\x00\x00\x00\x05" not in buf:
            chunk = sock.recv(65536)
            if not chunk:
                break
            buf += chunk
        return buf

    buf = b""
    while True:
        chunk = sock.recv(65536)
        if not chunk:
            break
        buf += chunk
        if len(buf) < 5:
            continue
        mtype = buf[0:1]
        if mtype == b"R":
            auth_type = struct.unpack(">I", buf[5:9])[0]
            if auth_type == 0:
                break
            elif auth_type == 3:
                pwd = password.encode() + b"\x00"
                sock.sendall(b"p" + struct.pack(">I", len(pwd) + 4) + pwd)
                buf = recv_until_ready()
                break
            elif auth_type == 5:
                salt = buf[9:13]
                h1 = hashlib.md5((password + user).encode()).hexdigest().encode()
                h2 = b"md5" + hashlib.md5(h1 + salt).hexdigest().encode() + b"\x00"
                sock.sendall(b"p" + struct.pack(">I", len(h2) + 4) + h2)
                buf = recv_until_ready()
                break
        if b"Z\x00\x00\x00\x05" in buf:
            break

    # Ждём ReadyForQuery если ещё нет
    if b"Z\x00\x00\x00\x05" not in buf:
        buf += recv_until_ready()

    # Запрос
    query_b = sql.encode("utf-8") + b"\x00"
    sock.sendall(b"Q" + struct.pack(">I", len(query_b) + 4) + query_b)

    response = b""
    while b"Z\x00\x00\x00\x05" not in response:
        chunk = sock.recv(65536)
        if not chunk:
            break
        response += chunk
    sock.close()

    # Парсим ErrorResponse
    i = 0
    rows = []
    while i < len(response):
        if i + 5 > len(response):
            break
        mtype = response[i:i+1]
        msg_len = struct.unpack(">I", response[i+1:i+5])[0]
        msg_body = response[i+5:i+1+msg_len]
        i += 1 + msg_len
        if mtype == b"E":
            # Ошибка — извлекаем текст
            parts = msg_body.split(b"\x00")
            err_text = " | ".join(p[1:].decode("utf-8", "replace") for p in parts if p and p[0:1] in (b"M", b"D"))
            raise RuntimeError(f"PG error: {err_text}")
        if mtype == b"D":
            num_cols = struct.unpack(">H", msg_body[0:2])[0]
            row = []
            j = 2
            for _ in range(num_cols):
                col_len = struct.unpack(">i", msg_body[j:j+4])[0]
                j += 4
                if col_len == -1:
                    row.append(None)
                else:
                    row.append(msg_body[j:j+col_len].decode("utf-8"))
                    j += col_len
            rows.append(row)
    return rows


def handler(event: dict, context) -> dict:
    """
    Shared key-value хранилище: одинаковые данные на всех устройствах.
    GET  /?key=xxx           — прочитать значение
    POST {key, value}        — записать значение
    POST {keys:[...]}        — прочитать несколько ключей
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    method = event.get("httpMethod", "GET")
    host, port, user, password, database, schema = _parse_db_url()

    try:
        if method == "GET":
            params = event.get("queryStringParameters") or {}
            key = params.get("key", "")
            if not key:
                return _json({"error": "key required"}, 400)
            rows = _pg(host, port, user, password, database, schema,
                       f"SELECT value FROM app_kv WHERE key = '{_esc(key)}'")
            value = json.loads(rows[0][0]) if rows and rows[0][0] is not None else None
            return _json({"key": key, "value": value})

        if method == "POST":
            body = json.loads(event.get("body") or "{}")

            if "keys" in body:
                keys = [str(k) for k in body["keys"]]
                if not keys:
                    return _json({})
                keys_sql = ",".join(f"'{_esc(k)}'" for k in keys)
                rows = _pg(host, port, user, password, database, schema,
                           f"SELECT key, value FROM app_kv WHERE key IN ({keys_sql})")
                return _json({r[0]: json.loads(r[1]) if r[1] is not None else None for r in rows})

            key = body.get("key")
            value = body.get("value")
            if key is None:
                return _json({"error": "key required"}, 400)
            value_json = _esc(json.dumps(value, ensure_ascii=False))
            _pg(host, port, user, password, database, schema,
                f"INSERT INTO app_kv (key, value, updated_at) VALUES ('{_esc(key)}', '{value_json}'::jsonb, NOW()) "
                f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()")
            return _json({"ok": True})

        return _json({"error": "method not allowed"}, 405)

    except Exception as e:
        return _json({"error": str(e)}, 500)

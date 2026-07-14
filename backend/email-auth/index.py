import json
import os
import re
import random
import socket
import struct
import hashlib
import smtplib
import urllib.parse
from email.mime.text import MIMEText


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
}

CODE_TTL_SECONDS = 600  # код действителен 10 минут


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

    params = f"user\x00{user}\x00database\x00{database}\x00options\x00-c search_path={schema},public\x00\x00"
    params_b = params.encode("utf-8")
    sock.sendall(struct.pack(">II", len(params_b) + 8, 196608) + params_b)

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

    if b"Z\x00\x00\x00\x05" not in buf:
        buf += recv_until_ready()

    query_b = sql.encode("utf-8") + b"\x00"
    sock.sendall(b"Q" + struct.pack(">I", len(query_b) + 4) + query_b)

    response = b""
    while b"Z\x00\x00\x00\x05" not in response:
        chunk = sock.recv(65536)
        if not chunk:
            break
        response += chunk
    sock.close()

    i = 0
    rows = []
    while i < len(response):
        if i + 5 > len(response):
            break
        mtype = response[i:i + 1]
        msg_len = struct.unpack(">I", response[i + 1:i + 5])[0]
        msg_body = response[i + 5:i + 1 + msg_len]
        i += 1 + msg_len
        if mtype == b"E":
            parts = msg_body.split(b"\x00")
            err_text = " | ".join(p[1:].decode("utf-8", "replace") for p in parts if p and p[0:1] in (b"M", b"D"))
            raise RuntimeError(f"PG error: {err_text}")
        if mtype == b"D":
            num_cols = struct.unpack(">H", msg_body[0:2])[0]
            row = []
            j = 2
            for _ in range(num_cols):
                col_len = struct.unpack(">i", msg_body[j:j + 4])[0]
                j += 4
                if col_len == -1:
                    row.append(None)
                else:
                    row.append(msg_body[j:j + col_len].decode("utf-8"))
                    j += col_len
            rows.append(row)
    return rows


def _kv_get(db_args, key):
    rows = _pg(*db_args, f"SELECT value FROM app_kv WHERE key = '{_esc(key)}'")
    return json.loads(rows[0][0]) if rows and rows[0][0] is not None else None


def _kv_set(db_args, key, value):
    value_json = _esc(json.dumps(value, ensure_ascii=False))
    _pg(*db_args,
        f"INSERT INTO app_kv (key, value, updated_at) VALUES ('{_esc(key)}', '{value_json}'::jsonb, NOW()) "
        f"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()")


def _valid_email(email):
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email or ""))


def _send_email(to_email, code):
    host = os.environ.get("SMTP_HOST", "")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    password = os.environ.get("SMTP_PASSWORD", "")
    from_addr = os.environ.get("SMTP_FROM", user)

    subject = "Код подтверждения — Мобильный инспектор"
    text = f"Ваш код подтверждения: {code}\n\nКод действителен 10 минут. Никому его не сообщайте."
    msg = MIMEText(text, "plain", "utf-8")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email

    with smtplib.SMTP(host, port, timeout=15) as server:
        server.starttls()
        server.login(user, password)
        server.sendmail(from_addr, [to_email], msg.as_string())


def handler(event: dict, context) -> dict:
    """
    Вход по email: отправка и проверка 4-значного кода подтверждения.
    POST {action: "send", email}          — сгенерировать код и отправить на почту
    POST {action: "verify", email, code}  — проверить код
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    if event.get("httpMethod") != "POST":
        return _json({"error": "method not allowed"}, 405)

    try:
        body = json.loads(event.get("body") or "{}")
        action = body.get("action")
        email = (body.get("email") or "").strip().lower()

        if not _valid_email(email):
            return _json({"error": "Некорректный email"}, 400)

        db_args = _parse_db_url()
        codes_key = "email_auth_codes"

        if action == "send":
            code = f"{random.randint(0, 9999):04d}"
            import time
            all_codes = _kv_get(db_args, codes_key) or {}
            all_codes[email] = {"code": code, "ts": int(time.time())}
            _kv_set(db_args, codes_key, all_codes)

            try:
                _send_email(email, code)
            except Exception as mail_err:
                return _json({"error": f"Не удалось отправить письмо: {mail_err}"}, 500)

            return _json({"ok": True})

        if action == "verify":
            code_input = (body.get("code") or "").strip()
            all_codes = _kv_get(db_args, codes_key) or {}
            entry = all_codes.get(email)
            if not entry:
                return _json({"ok": False, "error": "Код не запрашивался или истёк"}, 400)

            import time
            if int(time.time()) - int(entry.get("ts", 0)) > CODE_TTL_SECONDS:
                return _json({"ok": False, "error": "Код истёк, запросите новый"}, 400)

            if entry.get("code") != code_input:
                return _json({"ok": False, "error": "Неверный код"}, 400)

            # Код верный — удаляем его, чтобы нельзя было использовать повторно
            del all_codes[email]
            _kv_set(db_args, codes_key, all_codes)

            return _json({"ok": True})

        return _json({"error": "Неизвестное действие"}, 400)

    except Exception as e:
        return _json({"error": str(e)}, 500)

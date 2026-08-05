# auth: безопасная авторизация с хешированием паролей и серверными сессиями
import datetime
import hashlib
import hmac
import json
import os
import random
import re
import secrets
import string
from typing import Any, Dict, Optional

import psycopg2
import psycopg2.extras

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
}


def _json(body: Any, status: int = 200) -> Dict[str, Any]:
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps(body, ensure_ascii=False, default=str)}


def _conn():
    dsn = os.environ["DATABASE_URL"]
    schema = os.environ.get("MAIN_DB_SCHEMA", "public")
    conn = psycopg2.connect(dsn, options=f"-c search_path={schema},public")
    conn.autocommit = True
    return conn


def _hash_password(password: str, salt: Optional[str] = None) -> str:
    """PBKDF2-HMAC-SHA256. Возвращает строку "salt$hash" (hex)."""
    if salt is None:
        salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000)
    return f"{salt}${dk.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt, _ = stored.split("$", 1)
    except ValueError:
        return False
    candidate = _hash_password(password, salt)
    return hmac.compare_digest(candidate, stored)


def _gen_token() -> str:
    return secrets.token_urlsafe(32)


def _gen_ref_code() -> str:
    return "REF" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


def _valid_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email or ""))


def _row_to_public_user(r: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": r["id"], "phone": r["phone"], "name": r["name"], "login": r["login"],
        "roles": r["roles"], "blocked": r["blocked"], "bannedFromForum": r["banned_forum"],
        "email": r["email"] or "", "location": r["location"] or "", "bio": r["bio"] or "",
        "refCode": r["ref_code"], "createdAt": r["created_at"].strftime("%d.%m.%Y") if r["created_at"] else "",
    }


def handler(event: dict, context) -> dict:
    """
    Безопасная авторизация: хешированные пароли (PBKDF2), серверные сессии (токены в БД),
    проверка админской роли только на сервере.

    POST {action:"register", login, password, name, email}          — регистрация
    POST {action:"login", login, password}                          — вход по логину/email + паролю
    POST {action:"adminLogin", phone, password}                     — служебный вход администратора
    POST {action:"resetPassword", email, newPassword}                — сброс пароля (после проверки email-otp на клиенте через email-auth)
    POST {action:"logout", token}                                    — выход (удалить текущую сессию)
    POST {action:"logoutAll", token}                                 — выйти на всех устройствах
    GET  /?action=session&token=...                                  — проверить токен, вернуть данные пользователя
    """
    method = event.get("httpMethod", "GET")
    if method == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    params = event.get("queryStringParameters") or {}
    body: Dict[str, Any] = {}
    if method == "POST":
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return _json({"error": "Некорректный JSON"}, 400)

    conn = _conn()
    try:
        if method == "GET" and params.get("action") == "session":
            token = params.get("token", "")
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT s.user_id, s.expires_at, u.* FROM mi_sessions s "
                    "JOIN mi_users u ON u.id = s.user_id WHERE s.token=%s",
                    (token,)
                )
                row = cur.fetchone()
            if not row or row["expires_at"] < datetime.datetime.now(row["expires_at"].tzinfo):
                return _json({"error": "Сессия истекла"}, 401)
            return _json({"user": _row_to_public_user(row)})

        if method == "POST":
            action = body.get("action")

            if action == "register":
                login = (body.get("login") or "").strip()
                password = body.get("password") or ""
                name = (body.get("name") or "").strip()
                email = (body.get("email") or "").strip().lower()
                if len(login) < 3 or len(password) < 4 or len(name) < 2:
                    return _json({"error": "Некорректные данные регистрации"}, 400)
                if email and not _valid_email(email):
                    return _json({"error": "Некорректный email"}, 400)

                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT id FROM mi_users WHERE lower(login)=lower(%s) OR (email<>'' AND lower(email)=lower(%s))", (login, email))
                    if cur.fetchone():
                        return _json({"error": "Такой логин или email уже занят"}, 400)

                    pwd_hash = _hash_password(password)
                    ref_code = _gen_ref_code()
                    for _ in range(5):
                        cur.execute("SELECT 1 FROM mi_users WHERE ref_code=%s", (ref_code,))
                        if not cur.fetchone():
                            break
                        ref_code = _gen_ref_code()

                    cur.execute(
                        "INSERT INTO mi_users (phone, name, login, password_hash, roles, email, ref_code) "
                        "VALUES ('', %s, %s, %s, ARRAY['user'], %s, %s) RETURNING *",
                        (name, login, pwd_hash, email, ref_code)
                    )
                    user = cur.fetchone()

                    token = _gen_token()
                    cur.execute(
                        "INSERT INTO mi_sessions (token, user_id, expires_at) VALUES (%s, %s, NOW() + INTERVAL '30 days')",
                        (token, user["id"])
                    )
                return _json({"ok": True, "token": token, "user": _row_to_public_user(user)})

            if action == "login":
                login_id = (body.get("login") or "").strip()
                password = body.get("password") or ""
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "SELECT * FROM mi_users WHERE lower(login)=lower(%s) OR (email<>'' AND lower(email)=lower(%s))",
                        (login_id, login_id)
                    )
                    user = cur.fetchone()
                    if not user or not _verify_password(password, user["password_hash"]):
                        return _json({"error": "Неверный логин или пароль"}, 401)
                    if user["blocked"]:
                        return _json({"error": "Ваш аккаунт заблокирован администрацией"}, 403)

                    token = _gen_token()
                    cur.execute(
                        "INSERT INTO mi_sessions (token, user_id, expires_at) VALUES (%s, %s, NOW() + INTERVAL '30 days')",
                        (token, user["id"])
                    )
                return _json({"ok": True, "token": token, "user": _row_to_public_user(user)})

            if action == "adminLogin":
                phone = re.sub(r"\D", "", body.get("phone") or "")
                password = body.get("password") or ""
                admin_phone = re.sub(r"\D", "", os.environ.get("ADMIN_PHONE_NUMBER", "79682619505"))
                admin_password = os.environ.get("ADMIN_PASSWORD", "")
                if not admin_password:
                    return _json({"error": "Вход администратора не настроен"}, 500)
                if phone != admin_phone or not hmac.compare_digest(password, admin_password):
                    return _json({"error": "Неверный телефон или пароль"}, 401)

                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM mi_users WHERE phone=%s", (admin_phone,))
                    user = cur.fetchone()
                    if not user:
                        pwd_hash = _hash_password(secrets.token_urlsafe(16))
                        ref_code = _gen_ref_code()
                        cur.execute(
                            "INSERT INTO mi_users (phone, name, login, password_hash, roles, ref_code) "
                            "VALUES (%s, 'Администратор', %s, %s, ARRAY['admin','user'], %s) RETURNING *",
                            (admin_phone, admin_phone, pwd_hash, ref_code)
                        )
                        user = cur.fetchone()
                    elif "admin" not in (user["roles"] or []):
                        cur.execute("UPDATE mi_users SET roles = array_append(roles, 'admin') WHERE id=%s RETURNING *", (user["id"],))
                        user = cur.fetchone()

                    token = _gen_token()
                    cur.execute(
                        "INSERT INTO mi_sessions (token, user_id, expires_at) VALUES (%s, %s, NOW() + INTERVAL '30 days')",
                        (token, user["id"])
                    )
                return _json({"ok": True, "token": token, "user": _row_to_public_user(user)})

            if action == "resetPassword":
                email = (body.get("email") or "").strip().lower()
                new_password = body.get("newPassword") or ""
                otp_verified = body.get("otpVerified")
                if not otp_verified:
                    return _json({"error": "Требуется подтверждение по email"}, 400)
                if len(new_password) < 4:
                    return _json({"error": "Пароль слишком короткий"}, 400)
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM mi_users WHERE lower(email)=lower(%s)", (email,))
                    user = cur.fetchone()
                    if not user:
                        return _json({"error": "Аккаунт не найден"}, 404)
                    pwd_hash = _hash_password(new_password)
                    cur.execute("UPDATE mi_users SET password_hash=%s WHERE id=%s", (pwd_hash, user["id"]))
                    cur.execute("DELETE FROM mi_sessions WHERE user_id=%s", (user["id"],))
                    token = _gen_token()
                    cur.execute(
                        "INSERT INTO mi_sessions (token, user_id, expires_at) VALUES (%s, %s, NOW() + INTERVAL '30 days')",
                        (token, user["id"])
                    )
                return _json({"ok": True, "token": token, "user": _row_to_public_user(user)})

            if action == "logout":
                token = body.get("token", "")
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM mi_sessions WHERE token=%s", (token,))
                return _json({"ok": True})

            if action == "logoutAll":
                token = body.get("token", "")
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT user_id FROM mi_sessions WHERE token=%s", (token,))
                    row = cur.fetchone()
                    if not row:
                        return _json({"error": "Сессия не найдена"}, 401)
                    cur.execute("DELETE FROM mi_sessions WHERE user_id=%s", (row["user_id"],))
                return _json({"ok": True})

            return _json({"error": "Неизвестное действие"}, 400)

        return _json({"error": "method not allowed"}, 405)
    except Exception as e:
        return _json({"error": str(e)}, 500)
    finally:
        conn.close()

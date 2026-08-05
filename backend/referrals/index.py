# referrals: реферальные коды, бонусы продажников, вывод средств
import json
import os
import random
import string
from typing import Any, Dict

import psycopg2
import psycopg2.extras

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
}

BONUS_PCT = 0.10
MAX_BONUS_PER_PURCHASE = 5000


def _json(body: Any, status: int = 200) -> Dict[str, Any]:
    return {"statusCode": status, "headers": {**CORS, "Content-Type": "application/json"},
            "body": json.dumps(body, ensure_ascii=False, default=str)}


def _conn():
    dsn = os.environ["DATABASE_URL"]
    schema = os.environ.get("MAIN_DB_SCHEMA", "public")
    conn = psycopg2.connect(dsn, options=f"-c search_path={schema},public")
    conn.autocommit = True
    return conn


def _gen_code(user_id: int) -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"REF{user_id}{suffix}"


def handler(event: dict, context) -> dict:
    """
    Реферальная система: коды, проверка валидности, бонусы продажников, вывод средств.

    GET  /?action=myCode&userId=1                 — получить (или создать) свой реферальный код
    GET  /?action=myBonuses&userId=1               — список бонусных транзакций + общая сумма + баланс
    GET  /?action=myWithdrawals&userId=1           — список заявок на вывод текущего пользователя
    GET  /?action=allWithdrawals                    — все заявки на вывод (админ)
    POST {action:"check", code}                    — проверить валидность кода, вернуть owner
    POST {action:"regenerate", userId}              — сгенерировать новый код (не чаще раза в 30 дней)
    POST {action:"payoutBonus", userId, requestId, role, amount, referralCode} — начислить бонус
         (вызывается backend-логикой при подтверждении оплаты роли, а не напрямую с фронта)
    POST {action:"requestWithdraw", userId, amount, requisites} — заявка на вывод бонусов
    POST {action:"confirmWithdraw", withdrawId, adminUserId}     — админ подтверждает выплату
    POST {action:"rejectWithdraw", withdrawId, adminUserId}      — админ отклоняет выплату (сумма возвращается)
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
        if method == "GET" and params.get("action") == "myCode":
            user_id = int(params.get("userId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_referral_codes WHERE user_id=%s", (user_id,))
                row = cur.fetchone()
                if not row:
                    code = _gen_code(user_id)
                    cur.execute(
                        "INSERT INTO mi_referral_codes (user_id, code) VALUES (%s,%s) RETURNING *",
                        (user_id, code)
                    )
                    row = cur.fetchone()
            return _json({"code": row["code"], "isActive": row["is_active"], "createdAt": row["created_at"].strftime("%d.%m.%Y")})

        if method == "GET" and params.get("action") == "myBonuses":
            user_id = int(params.get("userId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM mi_referral_bonus_transactions WHERE referrer_id=%s ORDER BY created_at DESC",
                    (user_id,)
                )
                rows = cur.fetchall()
                cur.execute(
                    "SELECT COALESCE(SUM(amount),0) s FROM mi_referral_withdrawals WHERE referrer_id=%s AND status IN ('pending','completed')",
                    (user_id,)
                )
                withdrawn_or_frozen = float(cur.fetchone()["s"])
            total = sum(float(r["amount"]) for r in rows)
            return _json({
                "total": total,
                "balance": round(total - withdrawn_or_frozen, 2),
                "transactions": [{
                    "id": r["id"], "requestId": r["request_id"], "role": r["role"],
                    "amount": float(r["amount"]), "status": r["status"],
                    "date": r["created_at"].strftime("%d.%m.%Y %H:%M") if r["created_at"] else "",
                } for r in rows],
            })

        if method == "GET" and params.get("action") == "myWithdrawals":
            user_id = int(params.get("userId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_referral_withdrawals WHERE referrer_id=%s ORDER BY created_at DESC", (user_id,))
                rows = cur.fetchall()
            return _json({"withdrawals": [{
                "id": r["id"], "amount": float(r["amount"]), "requisites": r["requisites"],
                "status": r["status"], "date": r["created_at"].strftime("%d.%m.%Y %H:%M") if r["created_at"] else "",
            } for r in rows]})

        if method == "GET" and params.get("action") == "allWithdrawals":
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_referral_withdrawals WHERE status='pending' ORDER BY created_at ASC")
                rows = cur.fetchall()
            return _json({"withdrawals": [{
                "id": r["id"], "referrerId": r["referrer_id"], "amount": float(r["amount"]),
                "requisites": r["requisites"], "status": r["status"],
                "date": r["created_at"].strftime("%d.%m.%Y %H:%M") if r["created_at"] else "",
            } for r in rows]})

        if method == "POST":
            action = body.get("action")

            if action == "check":
                code = (body.get("code") or "").strip().upper()
                if not code:
                    return _json({"valid": False})
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM mi_referral_codes WHERE code=%s AND is_active=true", (code,))
                    row = cur.fetchone()
                if not row:
                    return _json({"valid": False})
                return _json({"valid": True, "ownerId": row["user_id"], "discountPct": BONUS_PCT})

            if action == "regenerate":
                user_id = int(body["userId"])
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM mi_referral_codes WHERE user_id=%s", (user_id,))
                    row = cur.fetchone()
                    if row:
                        import datetime
                        age_days = (datetime.datetime.now(row["created_at"].tzinfo) - row["created_at"]).days
                        if age_days < 30:
                            return _json({"error": f"Код можно менять раз в 30 дней. Осталось {30 - age_days} дн."}, 400)
                    new_code = _gen_code(user_id)
                    cur.execute(
                        "INSERT INTO mi_referral_codes (user_id, code) VALUES (%s,%s) "
                        "ON CONFLICT (user_id) DO UPDATE SET code=EXCLUDED.code, created_at=NOW() RETURNING *",
                        (user_id, new_code)
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "code": row["code"]})

            if action == "payoutBonus":
                user_id = int(body["userId"])
                request_id = int(body["requestId"])
                referral_code = (body.get("referralCode") or "").strip().upper()
                role = body.get("role", "")
                amount_base = float(body.get("amount", 0))

                if not referral_code:
                    return _json({"ok": True, "skipped": "no code"})

                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM mi_referral_codes WHERE code=%s AND is_active=true", (referral_code,))
                    ref = cur.fetchone()
                    if not ref:
                        return _json({"ok": True, "skipped": "invalid code"})
                    if ref["user_id"] == user_id:
                        return _json({"ok": True, "skipped": "self-referral not allowed"})

                    cur.execute("SELECT 1 FROM mi_referral_bonus_transactions WHERE request_id=%s", (request_id,))
                    if cur.fetchone():
                        return _json({"ok": True, "skipped": "already paid"})

                    bonus = min(round(amount_base * BONUS_PCT), MAX_BONUS_PER_PURCHASE)
                    cur.execute(
                        "INSERT INTO mi_referral_bonus_transactions (referrer_id, request_id, role, amount, status) "
                        "VALUES (%s,%s,%s,%s,'paid') RETURNING id",
                        (ref["user_id"], request_id, role, bonus)
                    )
                    tx = cur.fetchone()
                    cur.execute(
                        "INSERT INTO mi_notifications_db (user_id, text, type) VALUES (%s,%s,'info')",
                        (ref["user_id"], f"Начислен реферальный бонус {bonus:.0f} ₽ за оплату роли «{role}» по вашему коду.")
                    )
                return _json({"ok": True, "bonus": bonus, "transactionId": tx["id"]})

            if action == "requestWithdraw":
                user_id = int(body["userId"])
                amount = float(body.get("amount", 0))
                requisites = (body.get("requisites") or "").strip()
                if amount <= 0 or not requisites:
                    return _json({"error": "Укажите сумму и реквизиты"}, 400)
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT COALESCE(SUM(amount),0) s FROM mi_referral_bonus_transactions WHERE referrer_id=%s", (user_id,))
                    total = float(cur.fetchone()["s"])
                    cur.execute(
                        "SELECT COALESCE(SUM(amount),0) s FROM mi_referral_withdrawals WHERE referrer_id=%s AND status IN ('pending','completed')",
                        (user_id,)
                    )
                    reserved = float(cur.fetchone()["s"])
                    balance = total - reserved
                    if amount > balance:
                        return _json({"error": f"Недостаточно средств. Доступно: {balance:.0f} ₽"}, 400)
                    cur.execute(
                        "INSERT INTO mi_referral_withdrawals (referrer_id, amount, requisites, status) VALUES (%s,%s,%s,'pending') RETURNING id",
                        (user_id, amount, requisites)
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "confirmWithdraw":
                withdraw_id = int(body["withdrawId"])
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM mi_referral_withdrawals WHERE id=%s", (withdraw_id,))
                    w = cur.fetchone()
                    if not w or w["status"] != "pending":
                        return _json({"error": "Заявка не найдена или уже обработана"}, 404)
                    cur.execute("UPDATE mi_referral_withdrawals SET status='completed' WHERE id=%s", (withdraw_id,))
                    cur.execute(
                        "INSERT INTO mi_notifications_db (user_id, text, type) VALUES (%s,%s,'info')",
                        (w["referrer_id"], f"Выплата {float(w['amount']):.0f} ₽ подтверждена и отправлена по указанным реквизитам.")
                    )
                return _json({"ok": True})

            if action == "rejectWithdraw":
                withdraw_id = int(body["withdrawId"])
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM mi_referral_withdrawals WHERE id=%s", (withdraw_id,))
                    w = cur.fetchone()
                    if not w or w["status"] != "pending":
                        return _json({"error": "Заявка не найдена или уже обработана"}, 404)
                    cur.execute("UPDATE mi_referral_withdrawals SET status='rejected' WHERE id=%s", (withdraw_id,))
                    cur.execute(
                        "INSERT INTO mi_notifications_db (user_id, text, type) VALUES (%s,%s,'info')",
                        (w["referrer_id"], f"Заявка на вывод {float(w['amount']):.0f} ₽ отклонена администратором. Сумма возвращена на баланс.")
                    )
                return _json({"ok": True})

            return _json({"error": "Неизвестное действие"}, 400)

        return _json({"error": "method not allowed"}, 405)
    except Exception as e:
        return _json({"error": str(e)}, 500)
    finally:
        conn.close()

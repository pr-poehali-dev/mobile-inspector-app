import base64
import json
import os
import re
import uuid
from typing import Any, Dict, Optional

import boto3
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


def _s3_client():
    return boto3.client(
        "s3", endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def _cdn_url(key: str) -> str:
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def _upload_data_url(data_url: str, prefix: str) -> Optional[str]:
    if not data_url or not data_url.startswith("data:"):
        return None
    header, b64data = data_url.split(",", 1)
    mime = header.split(";")[0].replace("data:", "") or "application/octet-stream"
    ext = mime.split("/")[-1].split("+")[0] or "bin"
    key = f"rfp/{prefix}-{uuid.uuid4().hex}.{ext}"
    data = base64.b64decode(b64data)
    s3 = _s3_client()
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=mime)
    return _cdn_url(key)


def _row_to_rfp(r: Dict[str, Any], proposals_count: int) -> Dict[str, Any]:
    return {
        "id": r["id"], "title": r["title"], "desc": r["description"], "category": r["category"],
        "location": r["location"], "workTerm": r["work_term"], "deadline": r["deadline"],
        "status": r["status"], "proposals": proposals_count, "ownerId": r["owner_id"],
        "contactPhone": r["contact_phone"] or None,
    }


def handler(event: dict, context) -> dict:
    """
    РФП/закупки: создание запросов, предложения поставщиков, чат, рейтинг.
    GET  /?action=list                                — все RFP с числом предложений
    GET  /?action=proposals&rfpId=1                     — предложения по конкретному RFP
    GET  /?action=supplier&userId=1                     — профиль поставщика
    GET  /?action=chat&rfpId=1&supplierId=2             — сообщения чата
    GET  /?action=interests&supplierId=2                — уведомления о заинтересованности
    POST {action:"createRfp", ownerId, ...}             — создать RFP
    POST {action:"updateRfp", id, ownerId, ...}          — редактировать RFP
    POST {action:"setStatus", id, ownerId, status}       — изменить статус
    POST {action:"deleteRfp", id, ownerId}               — удалить RFP
    POST {action:"submitProposal", rfpId, supplierId,..} — отправить предложение
    POST {action:"rateProposal", proposalId, stars}      — оценить предложение
    POST {action:"selectWinner", rfpId, supplierId, fromName} — выбрать победителя (interest notice)
    POST {action:"saveSupplier", userId, ...}            — сохранить профиль поставщика
    POST {action:"sendChat", rfpId, supplierId, fromUserId, text} — отправить сообщение в чат
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
        if method == "GET" and params.get("action") == "proposals":
            rfp_id = int(params.get("rfpId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_rfp_proposals WHERE rfp_id=%s ORDER BY created_at DESC", (rfp_id,))
                rows = cur.fetchall()
                cur.execute("SELECT title FROM mi_rfp WHERE id=%s", (rfp_id,))
                rfp_row = cur.fetchone()
                rfp_title = rfp_row["title"] if rfp_row else ""
            return _json({"proposals": [{
                "id": r["id"], "rfpId": r["rfp_id"], "rfpTitle": rfp_title, "supplierId": r["supplier_id"],
                "company": r["company"], "price": float(r["price"]), "delivery": r["delivery"],
                "deliveryDays": r["delivery_days"], "file": r["file_url"],
                "manualRating": r["manual_rating"], "date": r["created_at"].strftime("%d.%m.%Y") if r["created_at"] else "",
            } for r in rows]})

        if method == "GET" and params.get("action") == "supplier":
            user_id = int(params.get("userId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_rfp_suppliers WHERE user_id=%s", (user_id,))
                row = cur.fetchone()
                cur.execute("SELECT COUNT(*) c FROM mi_rfp_proposals WHERE supplier_id=%s", (user_id,))
                completed = cur.fetchone()["c"]
            if not row:
                return _json({"supplier": None})
            return _json({"supplier": {
                "id": row["id"], "name": row["name"], "about": row["about"], "permit": row["permit"],
                "location": row["location"], "contacts": row["contacts"], "site": row["site"],
                "completedOrders": row["completed_orders"], "verified": row["verified"],
                "trustRating": min(5, 3.5 + row["completed_orders"] * 0.1),
            }})

        if method == "GET" and params.get("action") == "chat":
            rfp_id = int(params.get("rfpId", 0))
            supplier_id = int(params.get("supplierId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM mi_rfp_chats WHERE rfp_id=%s AND supplier_id=%s ORDER BY created_at ASC",
                    (rfp_id, supplier_id)
                )
                rows = cur.fetchall()
            return _json({"messages": [{
                "id": r["id"], "rfpId": r["rfp_id"], "supplierId": r["supplier_id"], "fromUserId": r["from_user_id"],
                "text": r["text"], "date": r["created_at"].strftime("%d.%m.%Y %H:%M") if r["created_at"] else "",
            } for r in rows]})

        if method == "GET" and params.get("action") == "interests":
            supplier_id = int(params.get("supplierId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_rfp_interests WHERE supplier_id=%s ORDER BY created_at DESC", (supplier_id,))
                rows = cur.fetchall()
            return _json({"interests": [{
                "id": r["id"], "supplierId": r["supplier_id"], "rfpId": r["rfp_id"], "rfpTitle": r["rfp_title"],
                "fromName": r["from_name"], "date": r["created_at"].strftime("%d.%m.%Y %H:%M") if r["created_at"] else "",
            } for r in rows]})

        if method == "GET":
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_rfp ORDER BY created_at DESC")
                rows = cur.fetchall()
                cur.execute("SELECT rfp_id, COUNT(*) c FROM mi_rfp_proposals GROUP BY rfp_id")
                counts = {r["rfp_id"]: r["c"] for r in cur.fetchall()}
            return _json({"rfps": [_row_to_rfp(r, counts.get(r["id"], 0)) for r in rows]})

        if method == "POST":
            action = body.get("action")

            if action == "createRfp":
                owner_id = int(body["ownerId"])
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO mi_rfp (owner_id, title, description, category, location, work_term, deadline, status, contact_phone) "
                        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                        (owner_id, body.get("title", ""), body.get("desc", ""), body.get("category", ""),
                         body.get("location", ""), body.get("workTerm", ""), body.get("deadline", ""),
                         body.get("status", "Активен"), body.get("contactPhone", ""))
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "updateRfp":
                rfp_id = int(body["id"])
                owner_id = int(body["ownerId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT owner_id FROM mi_rfp WHERE id=%s", (rfp_id,))
                    row = cur.fetchone()
                    if not row or row[0] != owner_id:
                        return _json({"error": "Нет доступа"}, 403)
                    cur.execute(
                        "UPDATE mi_rfp SET title=%s, description=%s, category=%s, location=%s, work_term=%s, "
                        "deadline=%s, contact_phone=%s WHERE id=%s",
                        (body.get("title", ""), body.get("desc", ""), body.get("category", ""), body.get("location", ""),
                         body.get("workTerm", ""), body.get("deadline", ""), body.get("contactPhone", ""), rfp_id)
                    )
                return _json({"ok": True})

            if action == "setStatus":
                rfp_id = int(body["id"])
                owner_id = int(body["ownerId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT owner_id FROM mi_rfp WHERE id=%s", (rfp_id,))
                    row = cur.fetchone()
                    if not row or row[0] != owner_id:
                        return _json({"error": "Нет доступа"}, 403)
                    cur.execute("UPDATE mi_rfp SET status=%s WHERE id=%s", (body.get("status", "Активен"), rfp_id))
                return _json({"ok": True})

            if action == "deleteRfp":
                rfp_id = int(body["id"])
                owner_id = int(body["ownerId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT owner_id FROM mi_rfp WHERE id=%s", (rfp_id,))
                    row = cur.fetchone()
                    if not row or row[0] != owner_id:
                        return _json({"error": "Нет доступа"}, 403)
                    cur.execute("DELETE FROM mi_rfp_proposals WHERE rfp_id=%s", (rfp_id,))
                    cur.execute("DELETE FROM mi_rfp WHERE id=%s", (rfp_id,))
                return _json({"ok": True})

            if action == "submitProposal":
                rfp_id = int(body["rfpId"])
                supplier_id = int(body["supplierId"])
                price_raw = str(body.get("price", "0"))
                price = float(re.sub(r"[^\d.]", "", price_raw) or 0)
                delivery_days_match = re.search(r"\d+", str(body.get("delivery", "")))
                delivery_days = int(delivery_days_match.group()) if delivery_days_match else 0
                file_url = _upload_data_url(body.get("fileData", ""), "proposal") or ""
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO mi_rfp_proposals (rfp_id, supplier_id, company, price, delivery, delivery_days, file_url) "
                        "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                        (rfp_id, supplier_id, body.get("company", ""), price, body.get("delivery", "—"), delivery_days, file_url)
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "rateProposal":
                proposal_id = int(body["proposalId"])
                stars = int(body["stars"])
                with conn.cursor() as cur:
                    cur.execute("UPDATE mi_rfp_proposals SET manual_rating=%s WHERE id=%s", (stars, proposal_id))
                return _json({"ok": True})

            if action == "selectWinner":
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO mi_rfp_interests (supplier_id, rfp_id, rfp_title, from_name) VALUES (%s,%s,%s,%s) RETURNING id",
                        (int(body["supplierId"]), int(body["rfpId"]), body.get("rfpTitle", ""), body.get("fromName", ""))
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "saveSupplier":
                user_id = int(body["userId"])
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO mi_rfp_suppliers (user_id, name, about, permit, location, contacts, site) "
                        "VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (user_id) DO UPDATE SET "
                        "name=EXCLUDED.name, about=EXCLUDED.about, permit=EXCLUDED.permit, location=EXCLUDED.location, "
                        "contacts=EXCLUDED.contacts, site=EXCLUDED.site",
                        (user_id, body.get("name", ""), body.get("about", ""), body.get("permit", ""),
                         body.get("location", ""), body.get("contacts", ""), body.get("site", ""))
                    )
                return _json({"ok": True})

            if action == "sendChat":
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO mi_rfp_chats (rfp_id, supplier_id, from_user_id, text) VALUES (%s,%s,%s,%s) RETURNING id",
                        (int(body["rfpId"]), int(body["supplierId"]), int(body["fromUserId"]), body.get("text", ""))
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            return _json({"error": "Неизвестное действие"}, 400)

        return _json({"error": "method not allowed"}, 405)
    except Exception as e:
        return _json({"error": str(e)}, 500)
    finally:
        conn.close()

import base64
import json
import os
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

SAMPLE_TEXT = """Настоящий документ является примером содержимого, доступного для просмотра внутри приложения всем пользователям бесплатно.

1. ОБЩИЕ ПОЛОЖЕНИЯ
1.1. Документ составлен в соответствии с действующим законодательством Российской Федерации.
1.2. Все стороны обязуются соблюдать условия настоящего документа.

2. ПРЕДМЕТ
2.1. Предметом является регулирование отношений между сторонами.
2.2. Условия согласованы и приняты обеими сторонами.

3. ОТВЕТСТВЕННОСТЬ СТОРОН
3.1. Стороны несут ответственность в соответствии с законодательством РФ.

4. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ
4.1. Документ вступает в силу с момента подписания.
4.2. Все изменения оформляются дополнительными соглашениями."""


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


def _upload_data_url(data_url: str, prefix: str, default_ext: str = "bin") -> Optional[str]:
    if not data_url or not data_url.startswith("data:"):
        return None
    header, b64data = data_url.split(",", 1)
    mime = header.split(";")[0].replace("data:", "") or "application/octet-stream"
    ext_map = {
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
        "application/msword": "doc",
        "application/vnd.ms-excel": "xls",
        "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
    }
    ext = ext_map.get(mime, default_ext)
    key = f"documents/{prefix}-{uuid.uuid4().hex}.{ext}"
    data = base64.b64decode(b64data)
    s3 = _s3_client()
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=mime)
    return _cdn_url(key)


def _row_to_doc(r: Dict[str, Any]) -> Dict[str, Any]:
    files = {}
    if r["pdf_url"]:
        files["pdf"] = r["pdf_url"]
    if r["docx_url"]:
        files["docx"] = r["docx_url"]
    if r["xlsx_url"]:
        files["xlsx"] = r["xlsx_url"]
    return {
        "id": r["id"], "name": r["name"], "category": r["category"], "docType": r["doc_type"],
        "direction": r["direction"], "dept": r["dept"],
        "date": r["created_at"].strftime("%d.%m.%Y") if r["created_at"] else "",
        "size": "—", "ownerId": r["owner_id"], "ownerName": r["owner_name"],
        "paid": r["paid"], "price": float(r["price"]), "content": r["content"] or SAMPLE_TEXT,
        "files": files,
    }


def handler(event: dict, context) -> dict:
    """
    Документы: публикация, каталог, покупка с подтверждением чека, файлы в облаке.
    GET  /?action=feed                              — каталог всех документов
    GET  /?action=my&userId=1                        — документы владельца
    GET  /?action=purchases&userId=1                  — купленные документы пользователя (ID)
    GET  /?action=incomingRequests&ownerId=1          — входящие заявки на покупку (продавцу)
    GET  /?action=myRequests&userId=1                 — мои заявки на покупку (статус)
    POST {action:"publish", ownerId, ...}             — опубликовать документ
    POST {action:"update", id, userId, ...}           — редактировать документ
    POST {action:"delete", id, userId}                — удалить документ
    POST {action:"buyRequest", docId, buyerId, receiptData, ...} — отправить чек на подтверждение
    POST {action:"confirmPurchase", requestId, ownerId} — продавец подтверждает оплату
    POST {action:"rejectPurchase", requestId, ownerId}  — продавец отклоняет оплату
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
        if method == "GET" and params.get("action") == "my":
            user_id = int(params.get("userId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_documents WHERE owner_id=%s ORDER BY created_at DESC", (user_id,))
                rows = cur.fetchall()
            return _json({"documents": [_row_to_doc(r) for r in rows]})

        if method == "GET" and params.get("action") == "purchases":
            user_id = int(params.get("userId", 0))
            with conn.cursor() as cur:
                cur.execute("SELECT doc_id FROM mi_doc_purchases WHERE user_id=%s", (user_id,))
                ids = [r[0] for r in cur.fetchall()]
            return _json({"purchasedIds": ids})

        if method == "GET" and params.get("action") == "incomingRequests":
            owner_id = int(params.get("ownerId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_doc_payment_requests WHERE owner_id=%s AND status='pending' ORDER BY created_at DESC", (owner_id,))
                rows = cur.fetchall()
            return _json({"requests": [{
                "id": r["id"], "docId": r["doc_id"], "docName": r["doc_name"], "price": float(r["price"]),
                "buyerId": r["buyer_id"], "buyerName": r["buyer_name"], "ownerId": r["owner_id"],
                "receiptImage": r["receipt_url"], "status": r["status"],
                "date": r["created_at"].strftime("%d.%m.%Y") if r["created_at"] else "",
            } for r in rows]})

        if method == "GET" and params.get("action") == "myRequests":
            user_id = int(params.get("userId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_doc_payment_requests WHERE buyer_id=%s ORDER BY created_at DESC", (user_id,))
                rows = cur.fetchall()
            return _json({"requests": [{
                "id": r["id"], "docId": r["doc_id"], "docName": r["doc_name"], "price": float(r["price"]),
                "buyerId": r["buyer_id"], "buyerName": r["buyer_name"], "ownerId": r["owner_id"],
                "status": r["status"],
            } for r in rows]})

        if method == "GET":
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_documents ORDER BY created_at DESC")
                rows = cur.fetchall()
            return _json({"documents": [_row_to_doc(r) for r in rows]})

        if method == "POST":
            action = body.get("action")

            if action == "publish":
                owner_id = int(body["ownerId"])
                pdf_url = _upload_data_url(body.get("pdfData", ""), "pdf") or ""
                docx_url = _upload_data_url(body.get("docxData", ""), "docx") or ""
                xlsx_url = _upload_data_url(body.get("xlsxData", ""), "xlsx") or ""
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO mi_documents (owner_id, owner_name, name, category, doc_type, direction, dept, "
                        "paid, price, content, pdf_url, docx_url, xlsx_url) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                        (owner_id, body.get("ownerName", ""), body.get("name", ""), body.get("category", ""),
                         body.get("docType", ""), body.get("direction", ""), body.get("ownerName", ""),
                         bool(body.get("paid")), float(body.get("price") or 0), body.get("content") or SAMPLE_TEXT,
                         pdf_url, docx_url, xlsx_url)
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "update":
                doc_id = int(body["id"])
                user_id = int(body["userId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT owner_id FROM mi_documents WHERE id=%s", (doc_id,))
                    row = cur.fetchone()
                    if not row or row[0] != user_id:
                        return _json({"error": "Нет доступа"}, 403)
                    set_clause = "name=%s, category=%s, doc_type=%s, direction=%s, paid=%s, price=%s"
                    params_upd = [body.get("name", ""), body.get("category", ""), body.get("docType", ""),
                                  body.get("direction", ""), bool(body.get("paid")), float(body.get("price") or 0)]
                    if body.get("content"):
                        set_clause += ", content=%s"
                        params_upd.append(body["content"])
                    for field, key in (("pdfData", "pdf_url"), ("docxData", "docx_url"), ("xlsxData", "xlsx_url")):
                        if body.get(field):
                            uploaded = _upload_data_url(body[field], key.split("_")[0])
                            if uploaded:
                                set_clause += f", {key}=%s"
                                params_upd.append(uploaded)
                    params_upd.append(doc_id)
                    cur.execute(f"UPDATE mi_documents SET {set_clause} WHERE id=%s", params_upd)
                return _json({"ok": True})

            if action == "delete":
                doc_id = int(body["id"])
                user_id = int(body["userId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT owner_id FROM mi_documents WHERE id=%s", (doc_id,))
                    row = cur.fetchone()
                    if not row or row[0] != user_id:
                        return _json({"error": "Нет доступа"}, 403)
                    cur.execute("DELETE FROM mi_documents WHERE id=%s", (doc_id,))
                return _json({"ok": True})

            if action == "buyRequest":
                doc_id = int(body["docId"])
                buyer_id = int(body["buyerId"])
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT owner_id, name, price FROM mi_documents WHERE id=%s", (doc_id,))
                    doc = cur.fetchone()
                    if not doc:
                        return _json({"error": "Документ не найден"}, 404)
                    receipt_url = _upload_data_url(body.get("receiptData", ""), "receipt", "png") or ""
                    cur.execute(
                        "INSERT INTO mi_doc_payment_requests (doc_id, doc_name, price, buyer_id, buyer_name, owner_id, receipt_url) "
                        "VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                        (doc_id, doc["name"], doc["price"], buyer_id, body.get("buyerName", ""), doc["owner_id"], receipt_url)
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "confirmPurchase":
                request_id = int(body["requestId"])
                owner_id = int(body["ownerId"])
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM mi_doc_payment_requests WHERE id=%s", (request_id,))
                    req = cur.fetchone()
                    if not req or req["owner_id"] != owner_id:
                        return _json({"error": "Нет доступа"}, 403)
                    cur.execute("UPDATE mi_doc_payment_requests SET status='confirmed' WHERE id=%s", (request_id,))
                    cur.execute(
                        "INSERT INTO mi_doc_purchases (doc_id, user_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                        (req["doc_id"], req["buyer_id"])
                    )
                return _json({"ok": True})

            if action == "rejectPurchase":
                request_id = int(body["requestId"])
                owner_id = int(body["ownerId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT owner_id FROM mi_doc_payment_requests WHERE id=%s", (request_id,))
                    row = cur.fetchone()
                    if not row or row[0] != owner_id:
                        return _json({"error": "Нет доступа"}, 403)
                    cur.execute("UPDATE mi_doc_payment_requests SET status='rejected' WHERE id=%s", (request_id,))
                return _json({"ok": True})

            return _json({"error": "Неизвестное действие"}, 400)

        return _json({"error": "method not allowed"}, 405)
    except Exception as e:
        return _json({"error": str(e)}, 500)
    finally:
        conn.close()

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

IMG_GRADIENTS = [
    "linear-gradient(135deg, #1b3a7a, #0f2050)",
    "linear-gradient(135deg, #7a1b1b, #501010)",
    "linear-gradient(135deg, #1a5c40, #0d3a28)",
    "linear-gradient(135deg, #7a5c10, #503c08)",
    "linear-gradient(135deg, #4a1b7a, #2d1050)",
]


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
    mime = header.split(";")[0].replace("data:", "") or "image/png"
    ext = mime.split("/")[-1].split("+")[0]
    if ext not in ("png", "jpeg", "jpg", "webp", "gif"):
        ext = "png"
    key = f"news/{prefix}-{uuid.uuid4().hex}.{ext}"
    data = base64.b64decode(b64data)
    s3 = _s3_client()
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=mime)
    return _cdn_url(key)


def _row_to_news(r: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": r["id"], "title": r["title"], "text": r["text"], "category": r["category"],
        "date": r["created_at"].strftime("%d.%m.%Y") if r["created_at"] else "",
        "authorId": r["author_id"], "authorName": r["author_name"],
        "image": r["image_gradient"], "imageData": r["image_url"] or None,
        "important": r["important"], "status": r["status"],
    }


def handler(event: dict, context) -> dict:
    """
    Новости: публикация, лента, блог автора, черновики.
    GET  /?action=feed                          — все опубликованные новости
    GET  /?action=my&userId=1                    — новости конкретного автора (включая черновики если это он сам)
    GET  /?action=blogProfile&userId=1           — профиль блога автора
    POST {action:"publish", authorId, ...}       — опубликовать/сохранить в черновик
    POST {action:"update", id, userId, ...}      — редактировать свою новость
    POST {action:"delete", id, userId}           — удалить свою новость
    POST {action:"saveBlogProfile", userId, ...} — сохранить настройки блога
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
        if method == "GET" and params.get("action") == "blogProfile":
            user_id = int(params.get("userId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_news_blog_profiles WHERE user_id=%s", (user_id,))
                row = cur.fetchone()
            if not row:
                return _json({"profile": None})
            return _json({"profile": {
                "banner": row["banner_gradient"], "bannerImage": row["banner_url"] or None,
                "name": row["name"], "description": row["description"], "location": row["location"],
            }})

        if method == "GET" and params.get("action") == "my":
            user_id = int(params.get("userId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_news WHERE author_id=%s ORDER BY created_at DESC", (user_id,))
                rows = cur.fetchall()
            return _json({"news": [_row_to_news(r) for r in rows]})

        if method == "GET":
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_news WHERE status='published' ORDER BY created_at DESC")
                rows = cur.fetchall()
            return _json({"news": [_row_to_news(r) for r in rows]})

        if method == "POST":
            action = body.get("action")

            if action == "publish":
                author_id = int(body["authorId"])
                image_url = ""
                if body.get("imageData"):
                    uploaded = _upload_data_url(body["imageData"], "img")
                    if uploaded:
                        image_url = uploaded
                gradient = IMG_GRADIENTS[author_id % len(IMG_GRADIENTS)]
                status = "published" if body.get("isEditor") else "draft"
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO mi_news (author_id, author_name, title, text, category, image_gradient, "
                        "image_url, important, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                        (author_id, body.get("authorName", ""), body.get("title", ""), body.get("text", ""),
                         body.get("category", ""), gradient, image_url, bool(body.get("important")), status)
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "update":
                news_id = int(body["id"])
                user_id = int(body["userId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT author_id FROM mi_news WHERE id=%s", (news_id,))
                    row = cur.fetchone()
                    if not row or row[0] != user_id:
                        return _json({"error": "Нет доступа"}, 403)
                    set_clause = "title=%s, text=%s, category=%s, important=%s"
                    params_upd = [body.get("title", ""), body.get("text", ""), body.get("category", ""), bool(body.get("important"))]
                    if body.get("imageData"):
                        uploaded = _upload_data_url(body["imageData"], "img")
                        if uploaded:
                            set_clause += ", image_url=%s"
                            params_upd.append(uploaded)
                    params_upd.append(news_id)
                    cur.execute(f"UPDATE mi_news SET {set_clause} WHERE id=%s", params_upd)
                return _json({"ok": True})

            if action == "delete":
                news_id = int(body["id"])
                user_id = int(body["userId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT author_id FROM mi_news WHERE id=%s", (news_id,))
                    row = cur.fetchone()
                    if not row or row[0] != user_id:
                        return _json({"error": "Нет доступа"}, 403)
                    cur.execute("DELETE FROM mi_news WHERE id=%s", (news_id,))
                return _json({"ok": True})

            if action == "saveBlogProfile":
                user_id = int(body["userId"])
                banner_url = ""
                if body.get("bannerImage"):
                    uploaded = _upload_data_url(body["bannerImage"], "banner")
                    if uploaded:
                        banner_url = uploaded
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO mi_news_blog_profiles (user_id, banner_gradient, banner_url, name, description, location) "
                        "VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT (user_id) DO UPDATE SET "
                        "banner_gradient=EXCLUDED.banner_gradient, "
                        "banner_url=CASE WHEN EXCLUDED.banner_url <> '' THEN EXCLUDED.banner_url ELSE mi_news_blog_profiles.banner_url END, "
                        "name=EXCLUDED.name, description=EXCLUDED.description, location=EXCLUDED.location",
                        (user_id, body.get("banner", ""), banner_url, body.get("name", ""), body.get("description", ""), body.get("location", ""))
                    )
                return _json({"ok": True})

            return _json({"error": "Неизвестное действие"}, 400)

        return _json({"error": "method not allowed"}, 405)
    except Exception as e:
        return _json({"error": str(e)}, 500)
    finally:
        conn.close()

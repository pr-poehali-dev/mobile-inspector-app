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
    key = f"forum/{prefix}-{uuid.uuid4().hex}.{ext}"
    data = base64.b64decode(b64data)
    s3 = _s3_client()
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=mime)
    return _cdn_url(key)


def handler(event: dict, context) -> dict:
    """
    Форум: темы и ответы, общие для всех пользователей.
    GET  /?action=topics&section=Общее          — список тем (с числом ответов), опционально по разделу
    GET  /?action=topic&id=5                     — тема с полным списком ответов
    POST {action:"createTopic", authorId, ...}   — создать тему
    POST {action:"reply", topicId, authorId, text, fileData} — ответить в теме
    POST {action:"delete", id}                   — удалить тему (админ)
    POST {action:"pin", id}                       — закрепить/открепить (админ)
    POST {action:"editTitle", id, title}          — изменить заголовок (админ)
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
        if method == "GET" and params.get("action") == "topic":
            topic_id = int(params.get("id", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_forum_topics WHERE id=%s", (topic_id,))
                t = cur.fetchone()
                if not t:
                    return _json({"error": "Тема не найдена"}, 404)
                cur.execute("SELECT * FROM mi_forum_replies WHERE topic_id=%s ORDER BY created_at ASC", (topic_id,))
                replies = cur.fetchall()
            return _json({"topic": {
                "id": t["id"], "title": t["title"], "author": t["author_name"], "authorId": t["author_id"],
                "time": t["created_at"].strftime("%d.%m.%Y %H:%M") if t["created_at"] else "",
                "section": t["section"], "pinned": t["pinned"], "hasFile": t["has_file"], "fileUrl": t["file_url"] or None,
                "replies": [{
                    "id": r["id"], "author": r["author_name"], "authorId": r["author_id"], "text": r["text"],
                    "fileUrl": r["file_url"] or None,
                    "time": r["created_at"].strftime("%d.%m.%Y %H:%M") if r["created_at"] else "",
                } for r in replies],
            }})

        if method == "GET":
            section = params.get("section")
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                if section and section != "Все":
                    cur.execute("SELECT * FROM mi_forum_topics WHERE section=%s ORDER BY pinned DESC, created_at DESC", (section,))
                else:
                    cur.execute("SELECT * FROM mi_forum_topics ORDER BY pinned DESC, created_at DESC")
                topics = cur.fetchall()
                cur.execute("SELECT topic_id, COUNT(*) c FROM mi_forum_replies GROUP BY topic_id")
                reply_counts = {r["topic_id"]: r["c"] for r in cur.fetchall()}
            return _json({"topics": [{
                "id": t["id"], "title": t["title"], "author": t["author_name"], "authorId": t["author_id"],
                "time": t["created_at"].strftime("%d.%m.%Y %H:%M") if t["created_at"] else "",
                "section": t["section"], "pinned": t["pinned"], "hasFile": t["has_file"],
                "repliesCount": reply_counts.get(t["id"], 0),
            } for t in topics]})

        if method == "POST":
            action = body.get("action")

            if action == "createTopic":
                author_id = int(body["authorId"])
                file_url = _upload_data_url(body.get("fileData", ""), "topic") or ""
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO mi_forum_topics (author_id, author_name, title, section, has_file, file_url) "
                        "VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
                        (author_id, body.get("authorName", ""), body.get("title", ""), body.get("section", "Общее"),
                         bool(file_url), file_url)
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "reply":
                topic_id = int(body["topicId"])
                author_id = int(body["authorId"])
                file_url = _upload_data_url(body.get("fileData", ""), "reply") or ""
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO mi_forum_replies (topic_id, author_id, author_name, text, file_url) "
                        "VALUES (%s,%s,%s,%s,%s) RETURNING id",
                        (topic_id, author_id, body.get("authorName", ""), body.get("text", ""), file_url)
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "delete":
                topic_id = int(body["id"])
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM mi_forum_replies WHERE topic_id=%s", (topic_id,))
                    cur.execute("DELETE FROM mi_forum_topics WHERE id=%s", (topic_id,))
                return _json({"ok": True})

            if action == "pin":
                topic_id = int(body["id"])
                with conn.cursor() as cur:
                    cur.execute("UPDATE mi_forum_topics SET pinned = NOT pinned WHERE id=%s", (topic_id,))
                return _json({"ok": True})

            if action == "editTitle":
                topic_id = int(body["id"])
                with conn.cursor() as cur:
                    cur.execute("UPDATE mi_forum_topics SET title=%s WHERE id=%s", (body.get("title", ""), topic_id))
                return _json({"ok": True})

            return _json({"error": "Неизвестное действие"}, 400)

        return _json({"error": "method not allowed"}, 405)
    except Exception as e:
        return _json({"error": str(e)}, 500)
    finally:
        conn.close()

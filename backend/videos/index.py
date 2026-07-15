import base64
import json
import os
import uuid
from typing import Any, Dict, List, Optional

import boto3
import psycopg2
import psycopg2.extras

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
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
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def _cdn_url(key: str) -> str:
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def _upload_data_url(data_url: str, prefix: str) -> Optional[str]:
    """Принимает data:mime;base64,xxxx и заливает в S3, возвращает CDN-ссылку."""
    if not data_url or not data_url.startswith("data:"):
        return None
    header, b64data = data_url.split(",", 1)
    mime = header.split(";")[0].replace("data:", "") or "application/octet-stream"
    ext = mime.split("/")[-1].split("+")[0]
    if ext not in ("png", "jpeg", "jpg", "webp", "gif", "mp4", "quicktime", "webm", "avi", "x-matroska"):
        ext = "bin"
    key = f"videos/{prefix}-{uuid.uuid4().hex}.{ext}"
    data = base64.b64decode(b64data)
    s3 = _s3_client()
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=mime)
    return _cdn_url(key)


def _row_to_video(row: Dict[str, Any], user_id: Optional[int], likes_count: int, fav_count: int, liked: bool, favorited: bool) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "hashtags": row["hashtags"] or [],
        "category": row["category"],
        "author": {
            "id": row["author_id"],
            "name": row["author_name"],
            "avatar": row["author_avatar"],
        },
        "views": row["views"],
        "likes": likes_count,
        "favoritedBy": fav_count,
        "likedByMe": liked,
        "favoritedByMe": favorited,
        "date": row["created_at"].strftime("%d.%m.%Y") if row["created_at"] else "",
        "videoUrl": row["video_url"],
        "bannerImage": row["banner_url"] or None,
        "thumbnail": row["thumbnail_gradient"],
        "status": row["status"],
    }


THUMB_COLORS = [
    "linear-gradient(135deg, #1b3a7a, #0f2050)",
    "linear-gradient(135deg, #7a1b1b, #501010)",
    "linear-gradient(135deg, #1a5c40, #0d3a28)",
    "linear-gradient(135deg, #7a5c10, #503c08)",
    "linear-gradient(135deg, #4a1b7a, #2d1050)",
    "linear-gradient(135deg, #7a1b50, #501030)",
]


def handler(event: dict, context) -> dict:
    """
    Видео: публикация, лента (общая для всех пользователей), лайки, избранное, комментарии, подписки.
    GET    /?action=feed&userId=1                       — лента всех опубликованных видео
    GET    /?action=comments&videoId=5                   — комментарии видео
    POST   {action:"publish", ...}                       — опубликовать новое видео
    POST   {action:"update", id, ...}                    — редактировать своё видео
    POST   {action:"delete", id, userId}                 — удалить своё видео
    POST   {action:"view", id}                           — увеличить счётчик просмотров
    POST   {action:"like", id, userId}                   — переключить лайк
    POST   {action:"favorite", id, userId}               — переключить избранное
    POST   {action:"comment", id, userId, authorName, text} — добавить комментарий
    POST   {action:"follow", followerId, authorId}       — переключить подписку на автора
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
        if method == "GET" and params.get("action") == "comments":
            video_id = int(params.get("videoId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, user_id, author_name, text, created_at FROM mi_video_comments "
                    "WHERE video_id = %s ORDER BY created_at ASC", (video_id,)
                )
                rows = cur.fetchall()
            comments = [{"id": r["id"], "author": r["author_name"], "text": r["text"],
                         "time": r["created_at"].strftime("%d.%m.%Y %H:%M") if r["created_at"] else ""} for r in rows]
            return _json({"comments": comments})

        if method == "GET":
            user_id = params.get("userId")
            user_id_int = int(user_id) if user_id else None
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, author_id, author_name, author_avatar, title, description, category, "
                    "hashtags, video_url, banner_url, thumbnail_gradient, views, status, created_at "
                    "FROM mi_videos WHERE status = 'published' ORDER BY created_at DESC"
                )
                videos = cur.fetchall()

                cur.execute("SELECT video_id, COUNT(*) c FROM mi_video_likes GROUP BY video_id")
                likes_map = {r["video_id"]: r["c"] for r in cur.fetchall()}

                cur.execute("SELECT video_id, COUNT(*) c FROM mi_video_favorites GROUP BY video_id")
                fav_map = {r["video_id"]: r["c"] for r in cur.fetchall()}

                liked_set, fav_set, follows_set = set(), set(), set()
                if user_id_int:
                    cur.execute("SELECT video_id FROM mi_video_likes WHERE user_id = %s", (user_id_int,))
                    liked_set = {r["video_id"] for r in cur.fetchall()}
                    cur.execute("SELECT video_id FROM mi_video_favorites WHERE user_id = %s", (user_id_int,))
                    fav_set = {r["video_id"] for r in cur.fetchall()}
                    cur.execute("SELECT author_id FROM mi_author_follows WHERE follower_id = %s", (user_id_int,))
                    follows_set = {r["author_id"] for r in cur.fetchall()}

            result = [
                _row_to_video(
                    v, user_id_int,
                    likes_map.get(v["id"], 0), fav_map.get(v["id"], 0),
                    v["id"] in liked_set, v["id"] in fav_set,
                ) for v in videos
            ]
            return _json({"videos": result, "following": list(follows_set)})

        if method == "POST":
            action = body.get("action")

            if action == "publish":
                author_id = int(body["authorId"])
                video_url = ""
                if body.get("videoFileData"):
                    uploaded = _upload_data_url(body["videoFileData"], "video")
                    if uploaded:
                        video_url = uploaded
                banner_url = ""
                if body.get("bannerData"):
                    uploaded_b = _upload_data_url(body["bannerData"], "banner")
                    if uploaded_b:
                        banner_url = uploaded_b
                thumbnail = THUMB_COLORS[author_id % len(THUMB_COLORS)]
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO mi_videos (author_id, author_name, author_avatar, title, description, "
                        "category, hashtags, video_url, banner_url, thumbnail_gradient) "
                        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id, created_at",
                        (author_id, body.get("authorName", ""), body.get("authorAvatar", ""),
                         body.get("title", ""), body.get("description", ""), body.get("category", ""),
                         body.get("hashtags", []), video_url, banner_url, thumbnail)
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "update":
                video_id = int(body["id"])
                user_id = int(body["userId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT author_id FROM mi_videos WHERE id = %s", (video_id,))
                    row = cur.fetchone()
                    if not row or row[0] != user_id:
                        return _json({"error": "Нет доступа"}, 403)
                    banner_url_sql = ""
                    params_upd = [body.get("title", ""), body.get("description", ""),
                                  body.get("category", ""), body.get("hashtags", [])]
                    set_clause = "title=%s, description=%s, category=%s, hashtags=%s"
                    if body.get("bannerData"):
                        uploaded_b = _upload_data_url(body["bannerData"], "banner")
                        if uploaded_b:
                            set_clause += ", banner_url=%s"
                            params_upd.append(uploaded_b)
                    params_upd.append(video_id)
                    cur.execute(f"UPDATE mi_videos SET {set_clause} WHERE id=%s", params_upd)
                return _json({"ok": True})

            if action == "delete":
                video_id = int(body["id"])
                user_id = int(body["userId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT author_id FROM mi_videos WHERE id = %s", (video_id,))
                    row = cur.fetchone()
                    if not row or row[0] != user_id:
                        return _json({"error": "Нет доступа"}, 403)
                    cur.execute("DELETE FROM mi_video_comments WHERE video_id=%s", (video_id,))
                    cur.execute("DELETE FROM mi_video_likes WHERE video_id=%s", (video_id,))
                    cur.execute("DELETE FROM mi_video_favorites WHERE video_id=%s", (video_id,))
                    cur.execute("DELETE FROM mi_videos WHERE id=%s", (video_id,))
                return _json({"ok": True})

            if action == "view":
                video_id = int(body["id"])
                with conn.cursor() as cur:
                    cur.execute("UPDATE mi_videos SET views = views + 1 WHERE id=%s", (video_id,))
                return _json({"ok": True})

            if action == "like":
                video_id = int(body["id"])
                user_id = int(body["userId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT 1 FROM mi_video_likes WHERE video_id=%s AND user_id=%s", (video_id, user_id))
                    exists = cur.fetchone()
                    if exists:
                        cur.execute("DELETE FROM mi_video_likes WHERE video_id=%s AND user_id=%s", (video_id, user_id))
                        liked = False
                    else:
                        cur.execute("INSERT INTO mi_video_likes (video_id, user_id) VALUES (%s,%s)", (video_id, user_id))
                        liked = True
                return _json({"ok": True, "liked": liked})

            if action == "favorite":
                video_id = int(body["id"])
                user_id = int(body["userId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT 1 FROM mi_video_favorites WHERE video_id=%s AND user_id=%s", (video_id, user_id))
                    exists = cur.fetchone()
                    if exists:
                        cur.execute("DELETE FROM mi_video_favorites WHERE video_id=%s AND user_id=%s", (video_id, user_id))
                        favorited = False
                    else:
                        cur.execute("INSERT INTO mi_video_favorites (video_id, user_id) VALUES (%s,%s)", (video_id, user_id))
                        favorited = True
                return _json({"ok": True, "favorited": favorited})

            if action == "comment":
                video_id = int(body["id"])
                user_id = int(body["userId"])
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO mi_video_comments (video_id, user_id, author_name, text) "
                        "VALUES (%s,%s,%s,%s) RETURNING id, created_at",
                        (video_id, user_id, body.get("authorName", ""), body.get("text", ""))
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "follow":
                follower_id = int(body["followerId"])
                author_id = int(body["authorId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT 1 FROM mi_author_follows WHERE follower_id=%s AND author_id=%s", (follower_id, author_id))
                    exists = cur.fetchone()
                    if exists:
                        cur.execute("DELETE FROM mi_author_follows WHERE follower_id=%s AND author_id=%s", (follower_id, author_id))
                        following = False
                    else:
                        cur.execute("INSERT INTO mi_author_follows (follower_id, author_id) VALUES (%s,%s)", (follower_id, author_id))
                        following = True
                return _json({"ok": True, "following": following})

            return _json({"error": "Неизвестное действие"}, 400)

        return _json({"error": "method not allowed"}, 405)
    except Exception as e:
        return _json({"error": str(e)}, 500)
    finally:
        conn.close()
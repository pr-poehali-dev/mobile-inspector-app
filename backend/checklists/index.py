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
    mime = header.split(";")[0].replace("data:", "") or "image/png"
    ext = mime.split("/")[-1].split("+")[0] or "png"
    key = f"checklists/{prefix}-{uuid.uuid4().hex}.{ext}"
    data = base64.b64decode(b64data)
    s3 = _s3_client()
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=mime)
    return _cdn_url(key)


def _build_hierarchy(conn) -> list:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM mi_checklist_spheres ORDER BY sort_order, id")
        spheres = cur.fetchall()
        cur.execute("SELECT * FROM mi_checklist_areas ORDER BY sort_order, id")
        areas = cur.fetchall()
        cur.execute("SELECT * FROM mi_checklist_defs ORDER BY sort_order, id")
        defs = cur.fetchall()
        cur.execute("SELECT * FROM mi_checklist_questions ORDER BY sort_order, id")
        questions = cur.fetchall()

    q_by_cl: Dict[int, list] = {}
    for q in questions:
        q_by_cl.setdefault(q["checklist_id"], []).append({
            "id": q["id"], "text": q["text"], "requirement": q["requirement"], "hint": q["hint"],
        })

    cl_by_area: Dict[int, list] = {}
    for d in defs:
        cl_by_area.setdefault(d["area_id"], []).append({
            "id": d["id"], "title": d["title"], "questions": q_by_cl.get(d["id"], []),
        })

    area_by_sphere: Dict[int, list] = {}
    for a in areas:
        area_by_sphere.setdefault(a["sphere_id"], []).append({
            "id": a["id"], "title": a["title"], "checklists": cl_by_area.get(a["id"], []),
        })

    return [{
        "id": s["id"], "title": s["title"], "icon": s["icon"], "color": s["color"],
        "areas": area_by_sphere.get(s["id"], []),
    } for s in spheres]


def handler(event: dict, context) -> dict:
    """
    Чек-листы: иерархия сфер/областей/чек-листов (общая) + личная история проверок.
    GET  /?action=hierarchy                       — вся иерархия сфер/областей/чек-листов
    GET  /?action=history&userId=1                — история проверок пользователя
    POST {action:"addSphere", title}               — добавить сферу (админ)
    POST {action:"addArea", sphereId, title}       — добавить область (админ)
    POST {action:"addChecklist", areaId, title}    — добавить чек-лист (админ)
    POST {action:"saveHistory", userId, ...}       — сохранить запись истории проверки
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
        if method == "GET" and params.get("action") == "history":
            user_id = int(params.get("userId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_checklist_history WHERE user_id=%s ORDER BY created_at DESC", (user_id,))
                rows = cur.fetchall()
            return _json({"history": [{
                "id": r["id"], "objectName": r["object_name"], "checklistTitle": r["checklist_title"],
                "sphereTitle": r["sphere_title"], "areaTitle": r["area_title"],
                "date": r["created_at"].strftime("%d.%m.%Y %H:%M") if r["created_at"] else "",
                "yes": r["yes_count"], "no": r["no_count"], "na": r["na_count"],
                "questions": r["questions"],
            } for r in rows]})

        if method == "GET":
            return _json({"spheres": _build_hierarchy(conn)})

        if method == "POST":
            action = body.get("action")

            if action == "addSphere":
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM mi_checklist_spheres")
                    order_n = cur.fetchone()["n"]
                    cur.execute(
                        "INSERT INTO mi_checklist_spheres (title, icon, color, sort_order) VALUES (%s,%s,%s,%s) RETURNING id",
                        (body.get("title", ""), body.get("icon", "MoreHorizontal"), body.get("color", "#64748b"), order_n)
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "addArea":
                sphere_id = int(body["sphereId"])
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM mi_checklist_areas WHERE sphere_id=%s", (sphere_id,))
                    order_n = cur.fetchone()["n"]
                    cur.execute(
                        "INSERT INTO mi_checklist_areas (sphere_id, title, sort_order) VALUES (%s,%s,%s) RETURNING id",
                        (sphere_id, body.get("title", ""), order_n)
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "addChecklist":
                area_id = int(body["areaId"])
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM mi_checklist_defs WHERE area_id=%s", (area_id,))
                    order_n = cur.fetchone()["n"]
                    cur.execute(
                        "INSERT INTO mi_checklist_defs (area_id, title, sort_order) VALUES (%s,%s,%s) RETURNING id",
                        (area_id, body.get("title", ""), order_n)
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "saveHistory":
                user_id = int(body.get("userId", 0))
                questions = body.get("questions", [])
                for q in questions:
                    photos = q.get("photos") or []
                    uploaded_photos = []
                    for p in photos:
                        if isinstance(p, str) and p.startswith("data:"):
                            url = _upload_data_url(p, "photo")
                            uploaded_photos.append(url or p)
                        else:
                            uploaded_photos.append(p)
                    q["photos"] = uploaded_photos
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO mi_checklist_history (user_id, object_name, checklist_title, sphere_title, "
                        "area_title, yes_count, no_count, na_count, questions) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                        (user_id, body.get("objectName", ""), body.get("checklistTitle", ""), body.get("sphereTitle", ""),
                         body.get("areaTitle", ""), int(body.get("yes", 0)), int(body.get("no", 0)), int(body.get("na", 0)),
                         json.dumps(questions, ensure_ascii=False))
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            return _json({"error": "Неизвестное действие"}, 400)

        return _json({"error": "method not allowed"}, 405)
    except Exception as e:
        return _json({"error": str(e)}, 500)
    finally:
        conn.close()
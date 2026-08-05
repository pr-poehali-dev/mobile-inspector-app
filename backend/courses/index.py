# courses: конструктор курсов, публикация, записи учеников, доступ к материалам
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

MAX_PDF_BYTES = 50 * 1024 * 1024  # 50 МБ


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


def _upload_data_url(data_url: str, prefix: str, allowed_mime: Optional[str] = None, max_bytes: Optional[int] = None) -> Optional[str]:
    if not data_url or not data_url.startswith("data:"):
        return None
    header, b64data = data_url.split(",", 1)
    mime = header.split(";")[0].replace("data:", "") or "application/octet-stream"
    if allowed_mime and mime != allowed_mime:
        raise ValueError(f"Недопустимый тип файла: {mime}, ожидается {allowed_mime}")
    data = base64.b64decode(b64data)
    if max_bytes and len(data) > max_bytes:
        raise ValueError(f"Файл слишком большой: {len(data)} байт, максимум {max_bytes}")
    ext_map = {"application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
    ext = ext_map.get(mime, "bin")
    key = f"courses/{prefix}-{uuid.uuid4().hex}.{ext}"
    s3 = _s3_client()
    s3.put_object(Bucket="files", Key=key, Body=data, ContentType=mime)
    return _cdn_url(key)


def _row_to_course(r: Dict[str, Any], enrolled_count: int = 0) -> Dict[str, Any]:
    return {
        "id": r["id"], "ownerId": r["owner_id"], "schoolName": r["school_name"],
        "title": r["title"], "description": r["description"], "price": float(r["price"]),
        "published": r["is_published"], "certName": r["cert_name"], "certHow": r["cert_how"],
        "modules": r["modules_json"], "maxStudents": r["max_students"],
        "enrolledCount": enrolled_count,
        "createdAt": r["created_at"].strftime("%d.%m.%Y") if r["created_at"] else "",
    }


def _row_to_enrollment(r: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": r["id"], "courseId": r["course_id"], "courseTitle": r["course_title"],
        "userId": r["user_id"], "fio": r["fio"], "phone": r["phone"], "ownerId": r["owner_id"],
        "status": r["status"], "rejectReason": r["reject_reason"] or None,
        "date": r["enrolled_at"].strftime("%d.%m.%Y") if r["enrolled_at"] else "",
        "approvedAt": r["approved_at"].strftime("%d.%m.%Y") if r["approved_at"] else None,
    }


def handler(event: dict, context) -> dict:
    """
    Курсы обучения: конструктор курсов (владелец), публикация, лента опубликованных, запись ученика,
    одобрение/отклонение владельцем, доступ к материалам по факту одобрения.

    GET  /?action=my&ownerId=1                      — курсы владельца (конструктор, включая черновики)
    GET  /?action=published                          — все опубликованные курсы (библиотека)
    GET  /?action=course&id=5                        — один курс по id (структура видна всем)
    GET  /?action=myEnrollments&userId=1              — заявки текущего ученика
    GET  /?action=courseRequests&ownerId=1            — заявки на курсы владельца
    GET  /?action=access&userId=1&courseId=5          — есть ли approved доступ у пользователя к курсу
    POST {action:"saveCourse", ownerId, ...}          — создать/обновить курс (upsert по id, если передан свой id)
    POST {action:"uploadLecturePdf", pdfData}         — загрузить PDF лекции (вернёт cdn url)
    POST {action:"publish", id, ownerId, published}   — опубликовать/снять с публикации
    POST {action:"deleteCourse", id, ownerId}         — удалить курс
    POST {action:"enroll", courseId, userId, fio, phone} — подать заявку на курс
    POST {action:"approve", enrollmentId, ownerId}    — одобрить заявку (владелец, не может одобрить сам себя)
    POST {action:"reject", enrollmentId, ownerId, reason} — отклонить заявку
    POST {action:"revoke", enrollmentId, ownerId}     — отозвать одобрение (закрыть доступ)
    POST {action:"manualEnroll", courseId, ownerId, userId, fio, phone} — владелец вручную добавляет ученика (сразу approved)
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
            owner_id = int(params.get("ownerId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_courses WHERE owner_id=%s ORDER BY created_at DESC", (owner_id,))
                rows = cur.fetchall()
                cur.execute("SELECT course_id, COUNT(*) c FROM mi_course_enrollments WHERE status='approved' GROUP BY course_id")
                counts = {r["course_id"]: r["c"] for r in cur.fetchall()}
            return _json({"courses": [_row_to_course(r, counts.get(r["id"], 0)) for r in rows]})

        if method == "GET" and params.get("action") == "published":
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_courses WHERE is_published=true ORDER BY created_at DESC")
                rows = cur.fetchall()
                cur.execute("SELECT course_id, COUNT(*) c FROM mi_course_enrollments WHERE status='approved' GROUP BY course_id")
                counts = {r["course_id"]: r["c"] for r in cur.fetchall()}
            return _json({"courses": [_row_to_course(r, counts.get(r["id"], 0)) for r in rows]})

        if method == "GET" and params.get("action") == "course":
            course_id = int(params.get("id", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_courses WHERE id=%s", (course_id,))
                row = cur.fetchone()
            if not row:
                return _json({"error": "Курс не найден"}, 404)
            return _json({"course": _row_to_course(row)})

        if method == "GET" and params.get("action") == "myEnrollments":
            user_id = int(params.get("userId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_course_enrollments WHERE user_id=%s ORDER BY enrolled_at DESC", (user_id,))
                rows = cur.fetchall()
            return _json({"enrollments": [_row_to_enrollment(r) for r in rows]})

        if method == "GET" and params.get("action") == "courseRequests":
            owner_id = int(params.get("ownerId", 0))
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM mi_course_enrollments WHERE owner_id=%s ORDER BY enrolled_at DESC", (owner_id,))
                rows = cur.fetchall()
            return _json({"enrollments": [_row_to_enrollment(r) for r in rows]})

        if method == "GET" and params.get("action") == "access":
            user_id = int(params.get("userId", 0))
            course_id = int(params.get("courseId", 0))
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM mi_course_enrollments WHERE user_id=%s AND course_id=%s AND status='approved'",
                    (user_id, course_id)
                )
                has_access = cur.fetchone() is not None
            return _json({"hasAccess": has_access})

        if method == "POST":
            action = body.get("action")

            if action == "saveCourse":
                owner_id = int(body["ownerId"])
                course_id = body.get("id")
                modules_json = json.dumps(body.get("modules", []), ensure_ascii=False)
                if course_id:
                    with conn.cursor() as cur:
                        cur.execute("SELECT owner_id FROM mi_courses WHERE id=%s", (int(course_id),))
                        row = cur.fetchone()
                        if not row or row[0] != owner_id:
                            return _json({"error": "Нет доступа"}, 403)
                        cur.execute(
                            "UPDATE mi_courses SET school_name=%s, title=%s, description=%s, price=%s, "
                            "cert_name=%s, cert_how=%s, modules_json=%s, max_students=%s, updated_at=NOW() WHERE id=%s",
                            (body.get("schoolName", ""), body.get("title", ""), body.get("description", ""),
                             float(body.get("price") or 0), body.get("certName", ""), body.get("certHow", ""),
                             modules_json, body.get("maxStudents"), int(course_id))
                        )
                    return _json({"ok": True, "id": int(course_id)})
                else:
                    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                        cur.execute(
                            "INSERT INTO mi_courses (owner_id, school_name, title, description, price, cert_name, "
                            "cert_how, modules_json, max_students) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                            (owner_id, body.get("schoolName", ""), body.get("title", ""), body.get("description", ""),
                             float(body.get("price") or 0), body.get("certName", ""), body.get("certHow", ""),
                             modules_json, body.get("maxStudents"))
                        )
                        row = cur.fetchone()
                    return _json({"ok": True, "id": row["id"]})

            if action == "uploadLecturePdf":
                try:
                    url = _upload_data_url(body.get("pdfData", ""), "lecture", "application/pdf", MAX_PDF_BYTES)
                except ValueError as e:
                    return _json({"error": str(e)}, 400)
                if not url:
                    return _json({"error": "Файл не передан"}, 400)
                return _json({"ok": True, "url": url})

            if action == "publish":
                course_id = int(body["id"])
                owner_id = int(body["ownerId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT owner_id FROM mi_courses WHERE id=%s", (course_id,))
                    row = cur.fetchone()
                    if not row or row[0] != owner_id:
                        return _json({"error": "Нет доступа"}, 403)
                    cur.execute("UPDATE mi_courses SET is_published=%s, updated_at=NOW() WHERE id=%s", (bool(body.get("published")), course_id))
                return _json({"ok": True})

            if action == "deleteCourse":
                course_id = int(body["id"])
                owner_id = int(body["ownerId"])
                with conn.cursor() as cur:
                    cur.execute("SELECT owner_id FROM mi_courses WHERE id=%s", (course_id,))
                    row = cur.fetchone()
                    if not row or row[0] != owner_id:
                        return _json({"error": "Нет доступа"}, 403)
                    cur.execute("DELETE FROM mi_course_enrollments WHERE course_id=%s", (course_id,))
                    cur.execute("DELETE FROM mi_courses WHERE id=%s", (course_id,))
                return _json({"ok": True})

            if action == "enroll":
                course_id = int(body["courseId"])
                user_id = int(body["userId"])
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT owner_id, title, max_students FROM mi_courses WHERE id=%s", (course_id,))
                    course = cur.fetchone()
                    if not course:
                        return _json({"error": "Курс не найден"}, 404)
                    if course["owner_id"] == user_id:
                        return _json({"error": "Нельзя записаться на собственный курс"}, 400)
                    cur.execute(
                        "SELECT id FROM mi_course_enrollments WHERE course_id=%s AND user_id=%s AND status IN ('pending','approved')",
                        (course_id, user_id)
                    )
                    if cur.fetchone():
                        return _json({"error": "Заявка уже подана"}, 400)
                    if course["max_students"] is not None:
                        cur.execute("SELECT COUNT(*) c FROM mi_course_enrollments WHERE course_id=%s AND status='approved'", (course_id,))
                        if cur.fetchone()["c"] >= course["max_students"]:
                            return _json({"error": "Достигнут лимит учеников на курсе"}, 400)
                    cur.execute(
                        "INSERT INTO mi_course_enrollments (course_id, course_title, user_id, fio, phone, owner_id, status) "
                        "VALUES (%s,%s,%s,%s,%s,%s,'pending') RETURNING id",
                        (course_id, course["title"], user_id, body.get("fio", ""), body.get("phone", ""), course["owner_id"])
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "manualEnroll":
                course_id = int(body["courseId"])
                owner_id = int(body["ownerId"])
                user_id = body.get("userId")
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT owner_id, title FROM mi_courses WHERE id=%s", (course_id,))
                    course = cur.fetchone()
                    if not course or course["owner_id"] != owner_id:
                        return _json({"error": "Нет доступа"}, 403)
                    cur.execute(
                        "INSERT INTO mi_course_enrollments (course_id, course_title, user_id, fio, phone, owner_id, status, approved_at) "
                        "VALUES (%s,%s,%s,%s,%s,%s,'approved',NOW()) RETURNING id",
                        (course_id, course["title"], user_id, body.get("fio", ""), body.get("phone", ""), owner_id)
                    )
                    row = cur.fetchone()
                return _json({"ok": True, "id": row["id"]})

            if action == "approve":
                enrollment_id = int(body["enrollmentId"])
                owner_id = int(body["ownerId"])
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM mi_course_enrollments WHERE id=%s", (enrollment_id,))
                    en = cur.fetchone()
                    if not en or en["owner_id"] != owner_id:
                        return _json({"error": "Нет доступа"}, 403)
                    if en["user_id"] == owner_id:
                        return _json({"error": "Нельзя одобрить самого себя"}, 400)
                    cur.execute(
                        "UPDATE mi_course_enrollments SET status='approved', approved_at=NOW(), reject_reason='' WHERE id=%s",
                        (enrollment_id,)
                    )
                    cur.execute(
                        "INSERT INTO mi_notifications_db (user_id, text, type) VALUES (%s,%s,'info')",
                        (en["user_id"], f"Ваша заявка на курс «{en['course_title']}» одобрена! Курс доступен в разделе «Мои курсы».")
                    )
                return _json({"ok": True})

            if action == "reject":
                enrollment_id = int(body["enrollmentId"])
                owner_id = int(body["ownerId"])
                reason = body.get("reason", "")
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM mi_course_enrollments WHERE id=%s", (enrollment_id,))
                    en = cur.fetchone()
                    if not en or en["owner_id"] != owner_id:
                        return _json({"error": "Нет доступа"}, 403)
                    cur.execute("UPDATE mi_course_enrollments SET status='rejected', reject_reason=%s WHERE id=%s", (reason, enrollment_id))
                    cur.execute(
                        "INSERT INTO mi_notifications_db (user_id, text, type) VALUES (%s,%s,'info')",
                        (en["user_id"], f"Заявка на курс «{en['course_title']}» отклонена" + (f": {reason}" if reason else "."))
                    )
                return _json({"ok": True})

            if action == "revoke":
                enrollment_id = int(body["enrollmentId"])
                owner_id = int(body["ownerId"])
                with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM mi_course_enrollments WHERE id=%s", (enrollment_id,))
                    en = cur.fetchone()
                    if not en or en["owner_id"] != owner_id:
                        return _json({"error": "Нет доступа"}, 403)
                    cur.execute("UPDATE mi_course_enrollments SET status='pending', approved_at=NULL WHERE id=%s", (enrollment_id,))
                    cur.execute(
                        "INSERT INTO mi_notifications_db (user_id, text, type) VALUES (%s,%s,'info')",
                        (en["user_id"], f"Доступ к курсу «{en['course_title']}» отозван владельцем.")
                    )
                return _json({"ok": True})

            return _json({"error": "Неизвестное действие"}, 400)

        return _json({"error": "method not allowed"}, 405)
    except Exception as e:
        return _json({"error": str(e)}, 500)
    finally:
        conn.close()

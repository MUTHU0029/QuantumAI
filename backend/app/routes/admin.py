import re
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from bson import ObjectId
from flask import Blueprint, current_app, g, jsonify, request
from pymongo import DESCENDING
from pymongo.errors import PyMongoError

from ..auth_tokens import roles_required
from ..content import public_exercise, public_lesson
from ..errors import api_error
from ..extensions import get_database
from ..users import InputValidationError, ensure_user_indexes, validate_name

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")
DIFFICULTIES = {"Beginner", "Intermediate", "Advanced"}
LESSON_TOPICS = {
    "Qubits",
    "Quantum Gates",
    "Superposition",
    "Entanglement",
    "Quantum Algorithms",
}


class StudentDeletionRace(Exception):
    pass


def _id_filter(value):
    return {"id": value}


def _iso(value):
    if not isinstance(value, datetime):
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _parse_date(value, fallback):
    if not value:
        return fallback
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError) as exc:
        raise ValueError("Dates must be valid ISO-8601 values.") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _analytics_range():
    now = datetime.now(timezone.utc)
    try:
        start = _parse_date(request.args.get("from"), now - timedelta(days=30))
        end = _parse_date(request.args.get("to"), now)
    except ValueError as exc:
        return None, None, (str(exc), 400)
    if start > end or end - start > timedelta(days=366):
        return None, None, ("Choose a valid date range of at most 366 days.", 400)
    return start, end, None


def _topic_from_lesson(lesson):
    return lesson.get("topic") or lesson.get("title") or "Other"


def _validate_lesson(payload):
    if not isinstance(payload, dict):
        raise InputValidationError("invalid_request", "A JSON object is required.")
    try:
        title = validate_name(payload.get("title"))
    except InputValidationError as exc:
        raise InputValidationError("invalid_title", str(exc)) from exc
    description = payload.get("description")
    topic = payload.get("topic")
    difficulty = payload.get("difficulty")
    content = payload.get("content")
    examples = payload.get("examples", [])
    if not isinstance(description, str) or not 1 <= len(description.strip()) <= 1000:
        raise InputValidationError("invalid_description", "Description must be 1–1000 characters.")
    if not isinstance(topic, str) or topic not in LESSON_TOPICS:
        raise InputValidationError("invalid_topic", "Choose a supported quantum topic.")
    if not isinstance(difficulty, str) or difficulty not in DIFFICULTIES:
        raise InputValidationError("invalid_difficulty", "Choose a supported difficulty.")
    if not isinstance(content, str) or not 1 <= len(content.strip()) <= 12000:
        raise InputValidationError("invalid_content", "Learning content must be 1–12000 characters.")
    if not isinstance(examples, list) or len(examples) > 20 or any(
        not isinstance(example, str) or not 1 <= len(example.strip()) <= 1000
        for example in examples
    ):
        raise InputValidationError("invalid_examples", "Provide up to 20 valid examples.")
    published = payload.get("published", False)
    if not isinstance(published, bool):
        raise InputValidationError("invalid_published", "Published must be true or false.")
    return {
        "title": title,
        "description": description.strip(),
        "topic": topic,
        "difficulty": difficulty,
        "content": content.strip(),
        "examples": [example.strip() for example in examples],
        "published": published,
    }


def _validate_exercise(payload):
    if not isinstance(payload, dict):
        raise InputValidationError("invalid_request", "A JSON object is required.")
    lesson_id = payload.get("lesson_id")
    if not isinstance(lesson_id, str) or not lesson_id:
        raise InputValidationError("invalid_lesson", "An associated lesson is required.")
    question = payload.get("question")
    options = payload.get("options")
    correct_index = payload.get("correct_index")
    explanation = payload.get("explanation")
    difficulty = payload.get("difficulty")
    published = payload.get("published", False)
    if not isinstance(question, str) or not 1 <= len(question.strip()) <= 1000:
        raise InputValidationError("invalid_question", "Question must be 1–1000 characters.")
    if (
        not isinstance(options, list)
        or not 2 <= len(options) <= 8
        or any(not isinstance(option, str) or not 1 <= len(option.strip()) <= 500 for option in options)
    ):
        raise InputValidationError("invalid_options", "Provide 2–8 valid answer options.")
    if (
        isinstance(correct_index, bool)
        or not isinstance(correct_index, int)
        or not 0 <= correct_index < len(options)
    ):
        raise InputValidationError("invalid_answer", "Correct answer must select one option.")
    if not isinstance(explanation, str) or not 1 <= len(explanation.strip()) <= 2000:
        raise InputValidationError("invalid_explanation", "Explanation must be 1–2000 characters.")
    if (
        not isinstance(difficulty, str)
        or difficulty not in DIFFICULTIES
        or not isinstance(published, bool)
    ):
        raise InputValidationError("invalid_exercise", "Difficulty or published state is invalid.")
    return {
        "lesson_id": lesson_id,
        "question": question.strip(),
        "options": [option.strip() for option in options],
        "correct_index": correct_index,
        "explanation": explanation.strip(),
        "difficulty": difficulty,
        "published": published,
    }


def _event_query(student_id=None, start=None, end=None, event_types=None):
    query = {}
    if student_id:
        query["student_id"] = student_id
    if start is not None or end is not None:
        query["created_at"] = {}
        if start is not None:
            query["created_at"]["$gte"] = start
        if end is not None:
            query["created_at"]["$lte"] = end
    if event_types:
        query["event_type"] = {"$in": event_types}
    return query


def _activity_summary(event):
    result = {
        "id": str(event["_id"]),
        "type": event["event_type"],
        "student_id": event["student_id"],
        "created_at": _iso(event.get("created_at")),
    }
    for key in ("lesson_id", "exercise_id", "score", "total", "topic", "success"):
        if key in event:
            result[key] = event[key]
    return result


@admin_bp.get("/dashboard")
@roles_required("admin")
def dashboard():
    database = get_database()
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=29)
    total_students = database.users.count_documents({"role": "student"})
    active_students = database.users.count_documents(
        {
            "role": "student",
            "last_active_at": {"$gte": now - timedelta(days=30)},
            "$or": [{"status": "active"}, {"status": {"$exists": False}}],
        }
    )
    student_events = {}
    total_simulations = database.activities.count_documents(
        {**student_events, "event_type": "circuit_simulation"}
    )
    total_tutor = database.activities.count_documents(
        {**student_events, "event_type": "tutor_interaction"}
    )
    registration_days = list(
        database.users.aggregate(
            [
                {"$match": {"role": "student", "created_at": {"$gte": start, "$lte": now}}},
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$created_at",
                                "timezone": "UTC",
                            }
                        },
                        "count": {"$sum": 1},
                    }
                },
                {"$sort": {"_id": 1}},
            ]
        )
    )
    activity_days = list(
        database.activities.aggregate(
            [
                {
                    "$match": {
                        **student_events,
                        "created_at": {"$gte": start, "$lte": now},
                    }
                },
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$created_at",
                                "timezone": "UTC",
                            }
                        },
                        "count": {"$sum": 1},
                    }
                },
                {"$sort": {"_id": 1}},
            ]
        )
    )
    recent = [
        _activity_summary(event)
        for event in database.activities.find(student_events)
        .sort("created_at", DESCENDING)
        .limit(12)
    ]
    recent_student_ids = list({activity["student_id"] for activity in recent})
    display_by_id = {
        user["user_id"]: {"name": user["name"], "email": user["email"]}
        for user in database.users.find(
            {"user_id": {"$in": recent_student_ids}, "role": "student"},
            {"user_id": 1, "name": 1, "email": 1},
        )
    } if recent_student_ids else {}
    for activity in recent:
        student = display_by_id.get(activity["student_id"])
        activity["student_name"] = student["name"] if student else "Removed account"
        activity["student_email"] = student["email"] if student else None
    return jsonify(
        {
            "stats": {
                "total_students": total_students,
                "active_students": active_students,
                "total_lessons": database.lessons.count_documents({}),
                "total_exercises": database.exercises.count_documents({}),
                "total_simulations": total_simulations,
                "tutor_interactions": total_tutor,
            },
            "registration_stats": [
                {"date": item["_id"], "count": item["count"]}
                for item in registration_days
            ],
            "activity_stats": [
                {"date": item["_id"], "count": item["count"]}
                for item in activity_days
            ],
            "recent_activities": recent,
            "active_window_days": 30,
            "admin": {
                "id": g.auth_user["id"],
                "name": g.auth_user["name"],
                "email": g.auth_user["email"],
            },
        }
    ), 200


@admin_bp.get("/students")
@roles_required("admin")
def list_students():
    database = get_database()
    search = request.args.get("search", "").strip()[:100]
    status = request.args.get("status", "all")
    ensure_user_indexes(database)
    try:
        limit = min(max(int(request.args.get("limit", "50")), 1), 100)
        offset = max(int(request.args.get("offset", "0")), 0)
    except ValueError:
        return api_error("invalid_pagination", "Limit and offset must be integers.", 400)
    if status not in {"all", "active", "inactive"}:
        return api_error("invalid_status", "Status must be active, inactive, or all.", 400)

    query = {"role": "student"}
    if status == "active":
        query["$or"] = [{"status": "active"}, {"status": {"$exists": False}}]
    elif status == "inactive":
        query["status"] = status
    if search:
        search_filter = [
            {"name": {"$regex": re.escape(search), "$options": "i"}},
            {"email": {"$regex": re.escape(search), "$options": "i"}},
        ]
        if "$or" in query:
            query = {
                "$and": [
                    query,
                    {"$or": search_filter},
                ]
            }
        else:
            query["$or"] = search_filter
    total = database.users.count_documents(query)
    records = list(
        database.users.find(
            query,
            {"_id": 0, "password_hash": 0},
        )
        .sort("created_at", DESCENDING)
        .skip(offset)
        .limit(limit)
    )
    student_ids = [user["user_id"] for user in records]
    completion_counts = {}
    if student_ids:
        for event in database.activities.find(
            {
                "student_id": {"$in": student_ids},
                "event_type": "lesson_complete",
            },
            {"student_id": 1, "lesson_id": 1},
        ):
            completion_counts.setdefault(event["student_id"], set()).add(
                event.get("lesson_id")
            )
    student_list = []
    for user in records:
        student_list.append(
            {
                "id": user["user_id"],
                "name": user["name"],
                "email": user["email"],
                "status": user.get("status", "active"),
                "created_at": _iso(user.get("created_at")),
                "last_active_at": _iso(user.get("last_active_at")),
                "completed_lessons": len(completion_counts.get(user["user_id"], set())),
            }
        )
    return jsonify({"students": student_list, "total": total, "limit": limit, "offset": offset}), 200


@admin_bp.get("/students/<student_id>")
@roles_required("admin")
def student_detail(student_id):
    database = get_database()
    user = database.users.find_one(
        {"user_id": student_id, "role": "student"},
        {"_id": 0, "password_hash": 0},
    )
    if user is None:
        return api_error("student_not_found", "Student was not found.", 404)
    events = list(
        database.activities.find({"student_id": student_id}).sort("created_at", DESCENDING).limit(250)
    )
    lesson_ids = list({event["lesson_id"] for event in events if event.get("lesson_id")})
    lessons = {
        lesson["id"]: lesson["title"]
        for lesson in database.lessons.find({"id": {"$in": lesson_ids}}, {"id": 1, "title": 1})
    }
    lesson_completions = [
        {"lesson_id": event["lesson_id"], "title": lessons.get(event["lesson_id"], event["lesson_id"]), "completed_at": _iso(event.get("created_at"))}
        for event in events
        if event["event_type"] == "lesson_complete"
    ]
    scores = [
        {
            "exercise_id": event["exercise_id"],
            "lesson_id": event.get("lesson_id"),
            "score": event["score"],
            "total": event["total"],
            "accuracy": round(100 * event["score"] / event["total"]) if event["total"] else 0,
            "submitted_at": _iso(event.get("created_at")),
        }
        for event in events
        if event["event_type"] == "exercise_submit"
    ]
    circuits = [event for event in events if event["event_type"] == "circuit_simulation"]
    return jsonify(
        {
            "student": {
                "id": user["user_id"],
                "name": user["name"],
                "email": user["email"],
                "status": user.get("status", "active"),
                "created_at": _iso(user.get("created_at")),
                "last_active_at": _iso(user.get("last_active_at")),
            },
            "progress": {
                "completed_lessons": lesson_completions,
                "exercise_scores": scores,
                "circuit_simulations": len(circuits),
                "gates_used": {
                    gate: sum(event.get("gates", {}).get(gate, 0) for event in circuits)
                    for gate in ("H", "X", "CNOT")
                },
            },
        }
    ), 200


@admin_bp.patch("/students/<student_id>/status")
@roles_required("admin")
def update_student_status(student_id):
    payload = request.get_json(silent=True)
    status = payload.get("status") if isinstance(payload, dict) else None
    if not isinstance(status, str) or status not in {"active", "inactive"}:
        return api_error("invalid_status", "Status must be active or inactive.", 400)
    result = get_database().users.update_one(
        {"user_id": student_id, "role": "student"},
        {"$set": {"status": status}},
    )
    if result.matched_count == 0:
        return api_error("student_not_found", "Student was not found.", 404)
    return jsonify({"id": student_id, "status": status}), 200


@admin_bp.delete("/students/<student_id>")
@roles_required("admin")
def delete_student(student_id):
    payload = request.get_json(silent=True)
    confirmation = payload.get("confirm_email") if isinstance(payload, dict) else None
    database = get_database()
    student = database.users.find_one(
        {"user_id": student_id, "role": "student"},
        {"_id": 0, "email": 1},
    )
    if student is None:
        return api_error("student_not_found", "Student was not found.", 404)
    if not isinstance(confirmation, str) or confirmation.strip().lower() != student["email"]:
        return api_error("confirmation_required", "Enter the student's email to confirm deletion.", 400)

    client = current_app.extensions["mongo_client"]
    try:
        with client.start_session() as session:
            with session.start_transaction():
                database.activities.delete_many({"student_id": student_id}, session=session)
                deleted = database.users.delete_one(
                    {"user_id": student_id, "role": "student"},
                    session=session,
                )
                if deleted.deleted_count != 1:
                    raise StudentDeletionRace()
    except StudentDeletionRace:
        return api_error("student_not_found", "Student was not found.", 404)
    except PyMongoError:
        current_app.logger.exception("Student account and activity deletion failed.")
        return api_error("delete_failed", "Student and linked activity could not be deleted.", 503)
    return jsonify({"status": "deleted"}), 200


@admin_bp.route("/lessons", methods=["GET", "POST"])
@roles_required("admin")
def lessons_collection():
    database = get_database()
    if request.method == "GET":
        records = [
            public_lesson(lesson)
            for lesson in database.lessons.find({}).sort("title", 1)
        ]
        return jsonify({"lessons": records}), 200
    try:
        values = _validate_lesson(request.get_json(silent=True))
    except InputValidationError as exc:
        return api_error(exc.code, str(exc), 400)
    now = datetime.now(timezone.utc)
    values.update(
        id=str(uuid4()),
        topics=[values["topic"]],
        duration="",
        progress=0,
        steps=[],
        explanation=values["content"],
        expectedOutcome="",
        circuitPlaceholder="",
        created_at=now,
        updated_at=now,
    )
    database.lessons.insert_one(values)
    return jsonify({"lesson": public_lesson(values)}), 201


@admin_bp.put("/lessons/<lesson_id>")
@roles_required("admin")
def update_lesson(lesson_id):
    try:
        values = _validate_lesson(request.get_json(silent=True))
    except InputValidationError as exc:
        return api_error(exc.code, str(exc), 400)
    values.update(
        topics=[values["topic"]],
        updated_at=datetime.now(timezone.utc),
    )
    result = get_database().lessons.update_one(_id_filter(lesson_id), {"$set": values})
    if result.matched_count == 0:
        return api_error("lesson_not_found", "Lesson was not found.", 404)
    return jsonify({"lesson": public_lesson(get_database().lessons.find_one(_id_filter(lesson_id)))}), 200


@admin_bp.delete("/lessons/<lesson_id>")
@roles_required("admin")
def delete_lesson(lesson_id):
    database = get_database()
    if database.lessons.find_one(_id_filter(lesson_id)) is None:
        return api_error("lesson_not_found", "Lesson was not found.", 404)
    client = current_app.extensions["mongo_client"]
    try:
        with client.start_session() as session:
            with session.start_transaction():
                database.activities.delete_many({"lesson_id": lesson_id}, session=session)
                database.exercises.delete_many({"lesson_id": lesson_id}, session=session)
                database.lessons.delete_one(_id_filter(lesson_id), session=session)
    except PyMongoError:
        current_app.logger.exception("Lesson and linked records deletion failed.")
        return api_error("delete_failed", "Lesson and linked records could not be deleted.", 503)
    return jsonify({"status": "deleted"}), 200


@admin_bp.route("/exercises", methods=["GET", "POST"])
@roles_required("admin")
def exercises_collection():
    database = get_database()
    if request.method == "GET":
        records = [
            public_exercise(exercise, include_answer=True)
            for exercise in database.exercises.find({}).sort("id", 1)
        ]
        return jsonify({"exercises": records}), 200
    try:
        values = _validate_exercise(request.get_json(silent=True))
    except InputValidationError as exc:
        return api_error(exc.code, str(exc), 400)
    if database.lessons.find_one({"id": values["lesson_id"]}, {"_id": 1}) is None:
        return api_error("lesson_not_found", "Associated lesson was not found.", 404)
    values["id"] = str(uuid4())
    database.exercises.insert_one(values)
    return jsonify({"exercise": public_exercise(values, include_answer=True)}), 201


@admin_bp.put("/exercises/<exercise_id>")
@roles_required("admin")
def update_exercise(exercise_id):
    try:
        values = _validate_exercise(request.get_json(silent=True))
    except InputValidationError as exc:
        return api_error(exc.code, str(exc), 400)
    database = get_database()
    if database.lessons.find_one({"id": values["lesson_id"]}, {"_id": 1}) is None:
        return api_error("lesson_not_found", "Associated lesson was not found.", 404)
    result = database.exercises.update_one(_id_filter(exercise_id), {"$set": values})
    if result.matched_count == 0:
        return api_error("exercise_not_found", "Exercise was not found.", 404)
    return jsonify({"exercise": public_exercise(database.exercises.find_one(_id_filter(exercise_id)), include_answer=True)}), 200


@admin_bp.delete("/exercises/<exercise_id>")
@roles_required("admin")
def delete_exercise(exercise_id):
    result = get_database().exercises.delete_one(_id_filter(exercise_id))
    if result.deleted_count == 0:
        return api_error("exercise_not_found", "Exercise was not found.", 404)
    return jsonify({"status": "deleted"}), 200


@admin_bp.get("/analytics")
@roles_required("admin")
def analytics():
    start, end, error = _analytics_range()
    if error:
        return api_error("invalid_date_range", error[0], error[1])
    student_id = request.args.get("student_id") or None
    database = get_database()
    if student_id and database.users.find_one(
        {"user_id": student_id, "role": "student"},
        {"_id": 1},
    ) is None:
        return api_error("student_not_found", "Student was not found.", 404)
    events = list(database.activities.find(_event_query(student_id, start, end)))
    completions = [event for event in events if event["event_type"] == "lesson_complete"]
    submissions = [event for event in events if event["event_type"] == "exercise_submit"]
    accuracy = (
        round(100 * sum(event["score"] for event in submissions) / sum(event["total"] for event in submissions), 1)
        if submissions and sum(event["total"] for event in submissions)
        else 0
    )
    lesson_ids = list({event["lesson_id"] for event in completions})
    lessons = {
        lesson["id"]: lesson
        for lesson in database.lessons.find({"id": {"$in": lesson_ids}})
    }
    topic_counts = {}
    for event in completions:
        lesson = lessons.get(event["lesson_id"], {})
        topic = _topic_from_lesson(lesson)
        row = topic_counts.setdefault(topic, {"topic": topic, "completions": 0})
        row["completions"] += 1
    difficulty = []
    for exercise in database.exercises.find({}):
        exercise_submissions = [
            event for event in submissions if event.get("exercise_id") == exercise["id"]
        ]
        if exercise_submissions:
            correct = sum(event["score"] for event in exercise_submissions)
            total = sum(event["total"] for event in exercise_submissions)
            difficulty.append(
                {
                    "exercise_id": exercise["id"],
                    "question": exercise["question"],
                    "accuracy": round(100 * correct / total, 1) if total else 0,
                    "attempts": total,
                }
            )
    topic_counts = sorted(
        topic_counts.values(),
        key=lambda item: item["completions"],
        reverse=True,
    )
    return jsonify(
        {
            "from": _iso(start),
            "to": _iso(end),
            "student_id": student_id,
            "total_completions": len(completions),
            "exercise_attempts": sum(event["total"] for event in submissions),
            "exercise_accuracy": accuracy,
            "lesson_completions_by_topic": topic_counts,
            "exercise_performance": difficulty,
        }
    ), 200


@admin_bp.get("/circuits")
@roles_required("admin")
def circuit_analytics():
    start, end, error = _analytics_range()
    if error:
        return api_error("invalid_date_range", error[0], error[1])
    query = _event_query(start=start, end=end, event_types=["circuit_simulation"])
    events = list(get_database().activities.find(query))
    gates = {gate: 0 for gate in ("H", "X", "CNOT")}
    configurations = {}
    errors = 0
    for event in events:
        for gate, count in event.get("gates", {}).items():
            if gate in gates:
                gates[gate] += count
        errors += int(not event.get("success", False))
        config_id = event.get("config_id")
        if config_id:
            configurations[config_id] = configurations.get(config_id, 0) + 1
    return jsonify(
        {
            "from": _iso(start),
            "to": _iso(end),
            "total_simulations": len(events),
            "errors": errors,
            "gates_used": gates,
            "frequent_configurations": [
                {"configuration_id": config, "attempts": attempts}
                for config, attempts in sorted(configurations.items(), key=lambda item: item[1], reverse=True)[:10]
            ],
            "privacy": "Circuit gate sequences and private circuit data are not stored or returned.",
        }
    ), 200


@admin_bp.get("/tutor")
@roles_required("admin")
def tutor_analytics():
    start, end, error = _analytics_range()
    if error:
        return api_error("invalid_date_range", error[0], error[1])
    database = get_database()
    query = _event_query(start=start, end=end)
    interactions = list(
        database.activities.find({**query, "event_type": "tutor_interaction"})
    )
    topic_counts = {}
    for event in interactions:
        topic = event.get("topic", "Other")
        topic_counts[topic] = topic_counts.get(topic, 0) + 1
    reports = [
        {
            "id": str(event["_id"]),
            "student_id": event["student_id"],
            "topic": event["topic"],
            "issue": event["issue"],
            "explanation": event["explanation"],
            "status": event.get("review_status", "open"),
            "verified_explanation": event.get("verified_explanation"),
            "created_at": _iso(event.get("created_at")),
        }
        for event in database.activities.find(
            {**query, "event_type": "tutor_report"}
        ).sort("created_at", DESCENDING).limit(100)
    ]
    return jsonify(
        {
            "from": _iso(start),
            "to": _iso(end),
            "interaction_count": len(interactions),
            "topics": [{"topic": topic, "count": count} for topic, count in topic_counts.items()],
            "reports": reports,
        }
    ), 200


@admin_bp.patch("/tutor/reports/<report_id>")
@roles_required("admin")
def review_tutor_report(report_id):
    if not ObjectId.is_valid(report_id):
        return api_error("report_not_found", "Tutor report was not found.", 404)
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return api_error("invalid_request", "A JSON object is required.", 400)
    status = payload.get("status")
    explanation = payload.get("verified_explanation")
    if not isinstance(status, str) or status not in {"open", "reviewed", "resolved"}:
        return api_error("invalid_status", "Status must be open, reviewed, or resolved.", 400)
    if status == "resolved" and (
        not isinstance(explanation, str) or not 1 <= len(explanation.strip()) <= 3000
    ):
        return api_error(
            "invalid_explanation",
            "A verified explanation is required to resolve a report.",
            400,
        )
    updates = {"review_status": status}
    if status == "resolved":
        updates["verified_explanation"] = explanation.strip()
    result = get_database().activities.update_one(
        {"_id": ObjectId(report_id), "event_type": "tutor_report"},
        {"$set": updates},
    )
    if result.matched_count == 0:
        return api_error("report_not_found", "Tutor report was not found.", 404)
    return jsonify({"id": report_id, **updates}), 200

import json
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from datetime import datetime, timezone

from flask import Blueprint, current_app, g, jsonify, request
from pymongo.errors import PyMongoError

from ..activity import record_activity, validate_activity
from ..auth_tokens import roles_required
from ..content import public_exercise, public_lesson
from ..errors import api_error
from ..extensions import get_database
from ..users import InputValidationError

student_bp = Blueprint("student", __name__, url_prefix="/api/student")
TUTOR_TOPICS = {"Qubits", "Superposition", "Quantum Gates", "Entanglement", "Other"}
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


@student_bp.get("/lessons")
@roles_required("student")
def list_lessons():
    database = get_database()
    lessons = [
        public_lesson(lesson)
        for lesson in database.lessons.find({"published": True}).sort("title", 1)
    ]
    return jsonify({"lessons": lessons}), 200


@student_bp.get("/lessons/<lesson_id>")
@roles_required("student")
def get_lesson(lesson_id):
    lesson = get_database().lessons.find_one(
        {"id": lesson_id, "published": True}
    )
    if lesson is None:
        return api_error("lesson_not_found", "Lesson was not found.", 404)
    return jsonify({"lesson": public_lesson(lesson)}), 200


@student_bp.get("/exercises")
@roles_required("student")
def list_exercises():
    lesson_id = request.args.get("lesson_id")
    query = {"published": True}
    if lesson_id:
        query["lesson_id"] = lesson_id
        if get_database().lessons.find_one(
            {"id": lesson_id, "published": True},
            {"_id": 1},
        ) is None:
            return jsonify({"exercises": []}), 200
    else:
        published_lessons = [
            lesson["id"]
            for lesson in get_database().lessons.find(
                {"published": True},
                {"id": 1},
            )
        ]
        query["lesson_id"] = {"$in": published_lessons}
    exercises = [
        public_exercise(exercise)
        for exercise in get_database().exercises.find(query).sort("id", 1)
    ]
    return jsonify({"exercises": exercises}), 200


@student_bp.get("/tutor/explanation")
@roles_required("student")
def tutor_explanation():
    topic = request.args.get("topic")
    if not isinstance(topic, str) or not topic:
        return api_error("invalid_topic", "A tutor topic is required.", 400)
    report = get_database().activities.find_one(
        {
            "event_type": "tutor_report",
            "topic": topic,
            "review_status": "resolved",
            "verified_explanation": {"$type": "string"},
        },
        sort=[("created_at", -1)],
    )
    return jsonify(
        {
            "topic": topic,
            "explanation": report.get("verified_explanation") if report else None,
        }
    ), 200


@student_bp.post("/tutor/chat")
@roles_required("student")
def tutor_chat():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return api_error("invalid_request", "A JSON object is required.", 400)

    question = payload.get("question")
    topic = payload.get("topic")
    if not isinstance(question, str) or not question.strip():
        return api_error("invalid_question", "A non-empty question is required.", 400)
    question = question.strip()
    if len(question) > 2000:
        return api_error(
            "invalid_question",
            "Questions must be 2,000 characters or fewer.",
            400,
        )
    if not isinstance(topic, str) or topic not in TUTOR_TOPICS:
        return api_error("invalid_topic", "Select a valid quantum learning topic.", 400)

    api_key = current_app.config["GEMINI_API_KEY"]
    if not api_key:
        return api_error(
            "tutor_unavailable",
            "The AI tutor is not configured. Add GEMINI_API_KEY to backend/.env and restart Flask.",
            503,
        )

    verified_context = None
    report = get_database().activities.find_one(
        {
            "event_type": "tutor_report",
            "topic": topic,
            "review_status": "resolved",
            "verified_explanation": {"$type": "string"},
        },
        sort=[("created_at", -1)],
    )
    if report:
        verified_context = report.get("verified_explanation")

    system_instruction = (
        "You are QuantumLearn AI, a careful, friendly tutor for beginner quantum "
        "computing students. Answer the student's question accurately and clearly. "
        "Use small examples where useful, define technical terms, and do not invent "
        "facts. Keep the answer focused on quantum computing and learning."
    )
    if verified_context:
        system_instruction += (
            "\nAn educator-verified explanation for this topic is provided below. "
            "Use it as trusted context and do not contradict it:\n" + verified_context
        )

    model = current_app.config["ROUTER_MODEL"]
    endpoint = GEMINI_API_URL.format(model=quote(model, safe=""))
    body = json.dumps(
        {
            "systemInstruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": [{"text": question}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 700},
        }
    ).encode("utf-8")
    gemini_request = Request(
        endpoint,
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    try:
        with urlopen(gemini_request, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        current_app.logger.warning("Gemini tutor returned HTTP %s.", exc.code)
        return api_error(
            "tutor_upstream_error",
            "Gemini could not answer right now. Please try again.",
            502,
        )
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        current_app.logger.warning(
            "Gemini tutor request failed (%s).", type(exc).__name__
        )
        return api_error(
            "tutor_unavailable",
            "The AI tutor is temporarily unavailable. Please try again.",
            503,
        )

    candidates = result.get("candidates", []) if isinstance(result, dict) else []
    parts = (
        candidates[0].get("content", {}).get("parts", [])
        if candidates and isinstance(candidates[0], dict)
        else []
    )
    answer = "\n".join(
        part["text"].strip()
        for part in parts
        if isinstance(part, dict)
        and isinstance(part.get("text"), str)
        and part["text"].strip()
    )
    if not answer:
        current_app.logger.warning("Gemini tutor returned no text content.")
        return api_error(
            "tutor_empty_response",
            "Gemini did not return an answer. Please rephrase your question.",
            502,
        )

    return jsonify({"response": answer}), 200


@student_bp.post("/exercises/<exercise_id>/submit")
@roles_required("student")
def submit_exercise(exercise_id):
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return api_error("invalid_request", "A JSON object is required.", 400)
    answer = payload.get("answer")
    if isinstance(answer, bool) or not isinstance(answer, int) or not 0 <= answer < 8:
        return api_error("invalid_answer", "Selected answer is invalid.", 400)

    database = get_database()
    exercise = database.exercises.find_one(
        {"id": exercise_id, "published": True}
    )
    if exercise is None:
        return api_error("exercise_not_found", "Exercise was not found.", 404)
    if database.lessons.find_one(
        {"id": exercise["lesson_id"], "published": True},
        {"_id": 1},
    ) is None:
        return api_error("exercise_not_found", "Exercise was not found.", 404)

    if answer >= len(exercise["options"]):
        return api_error("invalid_answer", "Selected answer is invalid.", 400)
    correct = answer == exercise["correct_index"]
    result = {
        "correct": correct,
        "explanation": exercise["explanation"],
        "score": int(correct),
        "total": 1,
    }
    database.activities.insert_one(
        {
            "event_type": "exercise_submit",
            "student_id": g.auth_user["id"],
            "exercise_id": exercise["id"],
            "lesson_id": exercise["lesson_id"],
            "score": result["score"],
            "total": result["total"],
            "created_at": datetime.now(timezone.utc),
        }
    )
    return jsonify(result), 200


@student_bp.post("/activity")
@roles_required("student")
def create_activity():
    try:
        event_data = validate_activity(request.get_json(silent=True))
    except InputValidationError as exc:
        return api_error(exc.code, str(exc), 400)

    database = get_database()
    if event_data["event_type"] in {"lesson_view", "lesson_complete"}:
        if database.lessons.find_one(
            {"id": event_data["lesson_id"], "published": True},
            {"_id": 1},
        ) is None:
            return api_error("lesson_not_found", "Lesson was not found.", 404)
    if event_data["event_type"] == "tutor_report":
        event_data["review_status"] = "open"
        event_data["verified_explanation"] = None

    try:
        record_activity(database, g.auth_user["id"], event_data)
    except PyMongoError:
        current_app.logger.exception("Could not record student activity.")
        return api_error("activity_unavailable", "Activity could not be recorded.", 503)
    return jsonify({"status": "recorded"}), 201

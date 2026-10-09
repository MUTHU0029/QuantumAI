import json
from datetime import datetime, timezone
from pathlib import Path

from pymongo import ASCENDING

ROOT = Path(__file__).resolve().parents[2]
CONTENT_DIR = ROOT / "shared-content"
QUESTION_LESSONS = {
    "qubit-basics": "qubits",
    "x-gate": "gates",
    "hadamard": "superposition",
    "entanglement": "entanglement",
}
LESSON_CATEGORIES = {
    "qubits": "Qubits",
    "gates": "Quantum Gates",
    "superposition": "Superposition",
    "entanglement": "Entanglement",
    "algorithms": "Quantum Algorithms",
}


def seed_content(database):
    lessons = json.loads((CONTENT_DIR / "lessons.json").read_text(encoding="utf-8"))
    questions = json.loads((CONTENT_DIR / "questions.json").read_text(encoding="utf-8"))

    database.lessons.create_index([("id", ASCENDING)], unique=True)
    database.lessons.create_index([("published", ASCENDING), ("topic", ASCENDING)])
    database.exercises.create_index([("id", ASCENDING)], unique=True)
    database.exercises.create_index([("lesson_id", ASCENDING)])
    database.activities.create_index([("created_at", ASCENDING)])
    database.activities.create_index(
        [("student_id", ASCENDING), ("created_at", ASCENDING)]
    )
    database.activities.create_index([("event_type", ASCENDING), ("created_at", ASCENDING)])

    now = datetime.now(timezone.utc)
    for lesson in lessons:
        document = {
            **lesson,
            "topic": LESSON_CATEGORIES[lesson["id"]],
            "content": lesson.get("explanation", ""),
            "examples": [],
            "published": True,
            "created_at": now,
            "updated_at": now,
        }
        database.lessons.update_one(
            {"id": lesson["id"]},
            {"$setOnInsert": document},
            upsert=True,
        )

    for question in questions:
        database.exercises.update_one(
            {"id": question["id"]},
            {
                "$setOnInsert": {
                    "id": question["id"],
                    "lesson_id": QUESTION_LESSONS.get(question["id"], "qubits"),
                    "question": question["question"],
                    "options": question["options"],
                    "correct_index": question["answer"],
                    "explanation": question["explanation"],
                    "difficulty": "Beginner",
                    "published": True,
                }
            },
            upsert=True,
        )


def public_lesson(lesson):
    result = {key: value for key, value in lesson.items() if key != "_id"}
    for key in ("created_at", "updated_at"):
        value = result.get(key)
        if isinstance(value, datetime):
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            result[key] = value.astimezone(timezone.utc).isoformat().replace(
                "+00:00", "Z"
            )
    return result


def public_exercise(exercise, include_answer=False):
    result = {key: value for key, value in exercise.items() if key != "_id"}
    if not include_answer:
        result.pop("correct_index", None)
    return result

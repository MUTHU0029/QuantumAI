from datetime import datetime, timezone
from hashlib import sha256

from .users import InputValidationError

ALLOWED_EVENTS = {
    "lesson_view",
    "lesson_complete",
    "exercise_submit",
    "circuit_simulation",
    "tutor_interaction",
    "tutor_report",
}
ALLOWED_TOPICS = {
    "Qubits",
    "Quantum Gates",
    "Superposition",
    "Entanglement",
    "Quantum Algorithms",
    "Other",
}
ALLOWED_GATES = {"H", "X", "CNOT"}


def _required_id(value, label):
    if not isinstance(value, str) or not 1 <= len(value) <= 80:
        raise InputValidationError("invalid_event", f"{label} is required.")
    return value


def validate_activity(payload):
    if not isinstance(payload, dict):
        raise InputValidationError("invalid_event", "A JSON object is required.")
    event_type = payload.get("event_type")
    if not isinstance(event_type, str) or event_type not in ALLOWED_EVENTS:
        raise InputValidationError("invalid_event", "Unsupported activity type.")

    data = {"event_type": event_type}
    if event_type in {"lesson_view", "lesson_complete"}:
        data["lesson_id"] = _required_id(payload.get("lesson_id"), "Lesson ID")
    elif event_type == "exercise_submit":
        data["exercise_id"] = _required_id(payload.get("exercise_id"), "Exercise ID")
        data["lesson_id"] = _required_id(payload.get("lesson_id"), "Lesson ID")
        score = payload.get("score")
        total = payload.get("total")
        if (
            isinstance(score, bool)
            or not isinstance(score, int)
            or isinstance(total, bool)
            or not isinstance(total, int)
            or total < 1
            or score < 0
            or score > total
            or total > 100
        ):
            raise InputValidationError("invalid_event", "Exercise score is invalid.")
        data.update(score=score, total=total)
    elif event_type == "circuit_simulation":
        gates = payload.get("gates")
        qubits = payload.get("qubits")
        success = payload.get("success")
        if (
            not isinstance(gates, list)
            or len(gates) > 100
            or any(not isinstance(gate, str) or gate not in ALLOWED_GATES for gate in gates)
            or isinstance(qubits, bool)
            or not isinstance(qubits, int)
            or not 1 <= qubits <= 8
            or not isinstance(success, bool)
        ):
            raise InputValidationError("invalid_event", "Simulation activity is invalid.")
        gate_counts = {gate: gates.count(gate) for gate in ALLOWED_GATES}
        config_material = f"{qubits}:{','.join(gates)}"
        data.update(
            gates=gate_counts,
            qubits=qubits,
            success=success,
            config_id=sha256(config_material.encode("utf-8")).hexdigest()[:16],
        )
    elif event_type in {"tutor_interaction", "tutor_report"}:
        topic = payload.get("topic")
        if not isinstance(topic, str) or topic not in ALLOWED_TOPICS:
            raise InputValidationError("invalid_event", "Unsupported tutor topic.")
        data["topic"] = topic
        if event_type == "tutor_report":
            issue = payload.get("issue")
            if not isinstance(issue, str) or not 1 <= len(issue.strip()) <= 1000:
                raise InputValidationError(
                    "invalid_event",
                    "Report details must be between 1 and 1000 characters.",
                )
            explanation = payload.get("explanation")
            if not isinstance(explanation, str) or not 1 <= len(explanation) <= 3000:
                raise InputValidationError(
                    "invalid_event",
                    "The reported explanation is invalid.",
                )
            data.update(issue=issue.strip(), explanation=explanation)
    return data


def record_activity(database, student_id, event_data):
    activity = {
        **event_data,
        "student_id": student_id,
        "created_at": datetime.now(timezone.utc),
    }
    if event_data["event_type"] == "tutor_report":
        activity.update(review_status="open", verified_explanation=None)
    database.activities.insert_one(activity)
    return activity

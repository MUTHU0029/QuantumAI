import io
import os
import re
import importlib.util
import unittest
from copy import deepcopy
from unittest.mock import patch

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app import create_app
from app.activity import validate_activity
from app.auth_tokens import issue_token
from app.users import InputValidationError
from app.users import create_user


class FakeUsersCollection:
    def __init__(self):
        self.documents = []

    def create_index(self, *_args, **_kwargs):
        return None

    def insert_one(self, document):
        for existing in self.documents:
            if existing["email"] == document["email"]:
                raise DuplicateKeyError("duplicate email")
            if (
                document["role"] == "admin"
                and existing["role"] == "admin"
            ):
                raise DuplicateKeyError("duplicate administrator")
        self.documents.append(deepcopy(document))

    def find_one(self, query, _projection=None):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return deepcopy(document)
        return None

    def update_one(self, query, update):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                document.update(update.get("$set", {}))
                return type("UpdateResult", (), {"matched_count": 1})()
        return type("UpdateResult", (), {"matched_count": 0})()

    def find(self, query, projection=None):
        return FakeCursor(
            [
                self._project(document, projection)
                for document in self.documents
                if matches(document, query)
            ]
        )

    def count_documents(self, query):
        return sum(matches(document, query) for document in self.documents)

    def aggregate(self, _pipeline):
        return []

    def _project(self, document, projection):
        result = deepcopy(document)
        if projection:
            for key, include in projection.items():
                if not include:
                    result.pop(key, None)
        return result

    def delete_one(self, query, session=None):
        del session
        for index, document in enumerate(self.documents):
            if matches(document, query):
                del self.documents[index]
                return type("DeleteResult", (), {"deleted_count": 1})()
        return type("DeleteResult", (), {"deleted_count": 0})()


def matches(document, query):
    for key, expected in query.items():
        if key == "$or":
            if not any(matches(document, item) for item in expected):
                return False
            continue
        if key == "$and":
            if not all(matches(document, item) for item in expected):
                return False
            continue
        actual = document.get(key)
        if isinstance(expected, dict):
            for operator, operand in expected.items():
                if operator == "$in" and actual not in operand:
                    return False
                if operator == "$gte" and (actual is None or actual < operand):
                    return False
                if operator == "$lte" and (actual is None or actual > operand):
                    return False
                if operator == "$exists" and (key in document) != operand:
                    return False
                if operator == "$regex":
                    flags = re.IGNORECASE if expected.get("$options") == "i" else 0
                    if actual is None or re.search(operand, actual, flags) is None:
                        return False
                if operator == "$type" and not isinstance(actual, str):
                    return False
        elif actual != expected:
            return False
    return True


class FakeCursor:
    def __init__(self, documents):
        self.documents = documents

    def sort(self, key, direction):
        self.documents.sort(key=lambda item: item.get(key) or "", reverse=direction < 0)
        return self

    def skip(self, count):
        self.documents = self.documents[count:]
        return self

    def limit(self, count):
        self.documents = self.documents[:count]
        return self

    def __iter__(self):
        return iter(self.documents)


class FakeCollection:
    def __init__(self):
        self.documents = []

    def create_index(self, *_args, **_kwargs):
        return None

    def insert_one(self, document):
        record = deepcopy(document)
        record.setdefault("_id", ObjectId())
        self.documents.append(record)

    def find_one(self, query, projection=None, sort=None):
        records = [
            FakeUsersCollection._project(self, document, projection)
            for document in self.documents
            if matches(document, query)
        ]
        if sort and records:
            records.sort(
                key=lambda item: item.get(sort[0][0]) or "",
                reverse=sort[0][1] < 0,
            )
        return records[0] if records else None

    def find(self, query=None, projection=None):
        query = query or {}
        return FakeCursor(
            [
                FakeUsersCollection._project(self, document, projection)
                for document in self.documents
                if matches(document, query)
            ]
        )

    def count_documents(self, query):
        return sum(matches(document, query) for document in self.documents)

    def aggregate(self, _pipeline):
        return []

    def update_one(self, query, update):
        for document in self.documents:
            if matches(document, query):
                document.update(update.get("$set", {}))
                return type("UpdateResult", (), {"matched_count": 1})()
        return type("UpdateResult", (), {"matched_count": 0})()

    def delete_one(self, query, session=None):
        del session
        for index, document in enumerate(self.documents):
            if matches(document, query):
                del self.documents[index]
                return type("DeleteResult", (), {"deleted_count": 1})()
        return type("DeleteResult", (), {"deleted_count": 0})()

    def delete_many(self, query, session=None):
        del session
        old_length = len(self.documents)
        self.documents = [item for item in self.documents if not matches(item, query)]
        return type("DeleteResult", (), {"deleted_count": old_length - len(self.documents)})()


class FakeDatabase:
    def __init__(self):
        self.users = FakeUsersCollection()
        self.lessons = FakeCollection()
        self.exercises = FakeCollection()
        self.activities = FakeCollection()


class FakeMongoClient:
    def __init__(self):
        self.database = FakeDatabase()

    def __getitem__(self, _name):
        return self.database

    def close(self):
        return None


class AuthApiTests(unittest.TestCase):
    def setUp(self):
        environment = patch.dict(
            os.environ,
            {
                "MONGODB_URI": "mongodb://localhost:27017",
                "MONGODB_DATABASE": "quantumlearn_test",
                "JWT_SECRET": "test-secret-" + ("x" * 40),
                "FRONTEND_ORIGIN": "http://localhost:5173",
                "GEMINI_API_KEY": "test-gemini-key",
                "ROUTER_MODEL": "gemini-3.1-flash-lite",
            },
        )
        environment.start()
        self.addCleanup(environment.stop)

        self.app = create_app({"TESTING": True})
        self.app.extensions["mongo_client"].close()
        self.mongo = FakeMongoClient()
        self.app.extensions["mongo_client"] = self.mongo
        self.client = self.app.test_client()

    def register_student(self, email="student@example.com"):
        return self.client.post(
            "/api/auth/register",
            json={
                "name": "Test Student",
                "email": email,
                "password": "correct-horse-battery-staple",
            },
        )

    def login(self, email, password="correct-horse-battery-staple"):
        return self.client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )

    def test_registration_assigns_student_and_never_returns_hash(self):
        response = self.register_student()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json["user"]["role"], "student")
        self.assertNotIn("password_hash", response.json["user"])
        self.assertNotEqual(
            self.mongo.database.users.documents[0]["password_hash"],
            "correct-horse-battery-staple",
        )

    def test_registration_rejects_roles_and_duplicate_emails(self):
        role_response = self.client.post(
            "/api/auth/register",
            json={
                "name": "Attacker",
                "email": "attacker@example.com",
                "password": "correct-horse-battery-staple",
                "role": "admin",
            },
        )
        self.assertEqual(role_response.status_code, 400)

        self.assertEqual(self.register_student().status_code, 201)
        duplicate_response = self.register_student()
        self.assertEqual(duplicate_response.status_code, 409)

    def test_login_returns_token_and_me_requires_it(self):
        self.register_student()
        response = self.login("student@example.com")
        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.json)
        self.assertNotIn("password_hash", response.json["user"])

        me_response = self.client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer " + response.json["token"]},
        )
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.json["user"]["role"], "student")
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)

    def test_login_rejects_invalid_password(self):
        self.register_student()
        response = self.login("student@example.com", "wrong-password")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json["error"]["code"], "invalid_credentials")

    def test_dashboards_enforce_role_and_authentication(self):
        self.register_student()
        student = self.login("student@example.com").json["token"]
        with self.app.app_context():
            admin_user = create_user(
                self.mongo.database,
                "Test Administrator",
                "admin@example.com",
                "a-different-strong-password",
                role="admin",
            )
            admin = issue_token(admin_user)

        self.assertEqual(
            self.client.get("/api/student/dashboard").status_code,
            401,
        )
        self.assertEqual(
            self.client.get(
                "/api/student/dashboard",
                headers={"Authorization": "Bearer " + student},
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.get(
                "/api/admin/dashboard",
                headers={"Authorization": "Bearer " + student},
            ).status_code,
            403,
        )
        self.assertEqual(
            self.client.get(
                "/api/admin/dashboard",
                headers={"Authorization": "Bearer " + admin},
            ).status_code,
            200,
        )

    def test_student_cannot_access_admin_management_or_analytics_routes(self):
        self.register_student()
        student_token = self.login("student@example.com").json["token"]
        headers = {"Authorization": "Bearer " + student_token}
        paths = [
            "/api/admin/dashboard",
            "/api/admin/students",
            "/api/admin/lessons",
            "/api/admin/exercises",
            "/api/admin/analytics",
            "/api/admin/circuits",
            "/api/admin/tutor",
        ]
        for path in paths:
            with self.subTest(path=path):
                response = self.client.get(path, headers=headers)
                self.assertEqual(response.status_code, 403)
        self.assertEqual(self.client.get("/api/admin/students").status_code, 401)

    def test_gemini_tutor_requires_student_authentication(self):
        with patch("app.routes.student.urlopen") as mocked_urlopen:
            response = self.client.post(
                "/api/student/tutor/chat",
                json={"question": "What is a qubit?", "topic": "Qubits"},
            )
        self.assertEqual(response.status_code, 401)
        mocked_urlopen.assert_not_called()

    def test_gemini_tutor_returns_model_answer_without_saving_chat(self):
        self.register_student()
        token = self.login("student@example.com").json["token"]
        provider_response = io.BytesIO(
            b'{"candidates":[{"content":{"parts":[{"text":"A qubit is a quantum bit."}]}}]}'
        )

        with patch(
            "app.routes.student.urlopen", return_value=provider_response
        ) as mocked_urlopen:
            response = self.client.post(
                "/api/student/tutor/chat",
                headers={"Authorization": "Bearer " + token},
                json={"question": "What is a qubit?", "topic": "Qubits"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["response"], "A qubit is a quantum bit.")
        provider_request = mocked_urlopen.call_args.args[0]
        self.assertEqual(
            provider_request.full_url,
            "https://generativelanguage.googleapis.com/v1beta/models/"
            "gemini-3.1-flash-lite:generateContent",
        )
        self.assertEqual(
            provider_request.get_header("X-goog-api-key"), "test-gemini-key"
        )
        self.assertEqual(self.mongo.database.activities.documents, [])

    def test_gemini_tutor_validates_input_and_requires_configuration(self):
        self.register_student()
        token = self.login("student@example.com").json["token"]
        headers = {"Authorization": "Bearer " + token}

        for payload in (
            {"question": "  ", "topic": "Qubits"},
            {"question": "What is a qubit?", "topic": "Not a topic"},
            {"question": "q" * 2001, "topic": "Qubits"},
        ):
            with self.subTest(payload=payload):
                response = self.client.post(
                    "/api/student/tutor/chat", headers=headers, json=payload
                )
                self.assertEqual(response.status_code, 400)

        self.app.config["GEMINI_API_KEY"] = ""
        response = self.client.post(
            "/api/student/tutor/chat",
            headers=headers,
            json={"question": "What is a qubit?", "topic": "Qubits"},
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json["error"]["code"], "tutor_unavailable")

    @unittest.skipUnless(
        importlib.util.find_spec("qiskit"),
        "Install backend requirements to run Qiskit circuit simulations.",
    )
    def test_qiskit_simulation_examples(self):
        self.register_student()
        token = self.login("student@example.com").json["token"]
        headers = {"Authorization": "Bearer " + token}
        examples = [
            ({"num_qubits": 1, "gates": [], "shots": 1000}, {"0": 1000}),
            (
                {"num_qubits": 1, "gates": [{"type": "X", "target": 0}], "shots": 1000},
                {"1": 1000},
            ),
            (
                {"num_qubits": 1, "gates": [{"type": "H", "target": 0}], "shots": 1000},
                None,
            ),
            (
                {
                    "num_qubits": 2,
                    "gates": [
                        {"type": "H", "target": 0},
                        {"type": "CNOT", "control": 0, "target": 1},
                    ],
                    "shots": 1000,
                },
                None,
            ),
            (
                {
                    "num_qubits": 1,
                    "gates": [
                        {"type": "X", "target": 0},
                        {"type": "X", "target": 0},
                    ],
                    "shots": 1000,
                },
                {"0": 1000},
            ),
        ]

        for payload, expected_counts in examples:
            with self.subTest(payload=payload):
                response = self.client.post(
                    "/api/simulation/run",
                    json=payload,
                    headers=headers,
                )
                self.assertEqual(response.status_code, 200)
                result = response.json
                self.assertTrue(result["success"])
                self.assertEqual(sum(result["counts"].values()), payload["shots"])
                self.assertAlmostEqual(
                    sum(result["probabilities"].values()),
                    100,
                    delta=0.05,
                )
                self.assertIn("circuit", result)
                self.assertIn("bit_order", result)
                if expected_counts is not None:
                    self.assertEqual(result["counts"], expected_counts)
                elif payload["num_qubits"] == 1:
                    self.assertAlmostEqual(result["probabilities"].get("0", 0), 50, delta=10)
                    self.assertAlmostEqual(result["probabilities"].get("1", 0), 50, delta=10)
                else:
                    self.assertAlmostEqual(result["probabilities"].get("00", 0), 50, delta=10)
                    self.assertAlmostEqual(result["probabilities"].get("11", 0), 50, delta=10)
                    self.assertEqual(result["probabilities"].get("01", 0), 0)
                    self.assertEqual(result["probabilities"].get("10", 0), 0)

    def test_simulation_validates_input_and_requires_a_student_token(self):
        self.assertEqual(
            self.client.post("/api/simulation/run", json={"num_qubits": 1}).status_code,
            401,
        )
        self.register_student()
        token = self.login("student@example.com").json["token"]
        headers = {"Authorization": "Bearer " + token}
        invalid_payloads = [
            {"num_qubits": 0, "gates": []},
            {"num_qubits": 4, "gates": []},
            {"num_qubits": 1, "shots": 0, "gates": []},
            {"num_qubits": 1, "shots": 10001, "gates": []},
            {"num_qubits": 1, "gates": [{"type": "H", "target": 1}]},
            {"num_qubits": 1, "gates": [{"type": "CNOT", "control": 0, "target": 0}]},
            {"num_qubits": 2, "gates": [{"type": "X", "target": 0, "control": 1}]},
            {"num_qubits": 1, "gates": [{"type": [], "target": 0}]},
        ]
        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                response = self.client.post(
                    "/api/simulation/run",
                    json=payload,
                    headers=headers,
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn("error", response.json)

    def test_invalid_activity_payloads_are_rejected_without_database_writes(self):
        invalid_payloads = [
            {
                "event_type": "circuit_simulation",
                "gates": [{}],
                "qubits": 2,
                "success": True,
            },
            {
                "event_type": "tutor_interaction",
                "topic": [],
            },
        ]
        for payload in invalid_payloads:
            with self.subTest(payload=payload):
                with self.assertRaises(InputValidationError):
                    validate_activity(payload)

    def test_student_deactivation_invalidates_an_existing_token(self):
        self.register_student()
        login = self.login("student@example.com")
        self.assertEqual(login.status_code, 200)
        student_token = login.json["token"]
        student_id = self.mongo.database.users.documents[0]["user_id"]
        with self.app.app_context():
            admin_user = create_user(
                self.mongo.database,
                "Test Administrator",
                "admin@example.com",
                "a-different-strong-password",
                role="admin",
            )
            admin_token = issue_token(admin_user)
        response = self.client.patch(
            f"/api/admin/students/{student_id}/status",
            json={"status": "inactive"},
            headers={"Authorization": "Bearer " + admin_token},
        )
        self.assertEqual(response.status_code, 200)
        deactivated_login = self.login("student@example.com")
        self.assertEqual(deactivated_login.status_code, 403)
        me = self.client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer " + student_token},
        )
        self.assertEqual(me.status_code, 401)

    def test_admin_content_management_keeps_answer_key_private(self):
        with self.app.app_context():
            admin_user = create_user(
                self.mongo.database,
                "Test Administrator",
                "admin@example.com",
                "a-different-strong-password",
                role="admin",
            )
            admin_token = issue_token(admin_user)
        admin_headers = {"Authorization": "Bearer " + admin_token}

        lesson_response = self.client.post(
            "/api/admin/lessons",
            json={
                "title": "Quantum Basics",
                "description": "Learn a qubit",
                "topic": "Qubits",
                "difficulty": "Beginner",
                "content": "A qubit stores quantum information.",
                "examples": ["A spin state"],
                "published": True,
            },
            headers=admin_headers,
        )
        self.assertEqual(lesson_response.status_code, 201)
        lesson_id = lesson_response.json["lesson"]["id"]
        exercise_response = self.client.post(
            "/api/admin/exercises",
            json={
                "lesson_id": lesson_id,
                "question": "What does a qubit store?",
                "options": ["Classical state", "Quantum state"],
                "correct_index": 1,
                "explanation": "A qubit stores quantum information.",
                "difficulty": "Beginner",
                "published": True,
            },
            headers=admin_headers,
        )
        self.assertEqual(exercise_response.status_code, 201)
        exercise_id = exercise_response.json["exercise"]["id"]

        self.register_student()
        student_token = self.login("student@example.com").json["token"]
        student_headers = {"Authorization": "Bearer " + student_token}
        exercises = self.client.get(
            f"/api/student/exercises?lesson_id={lesson_id}",
            headers=student_headers,
        )
        self.assertEqual(exercises.status_code, 200)
        self.assertNotIn("correct_index", exercises.json["exercises"][0])
        self.assertEqual(
            self.client.get(
                "/api/admin/exercises",
                headers=admin_headers,
            ).json["exercises"][0]["correct_index"],
            1,
        )
        result = self.client.post(
            f"/api/student/exercises/{exercise_id}/submit",
            json={"answer": 1},
            headers=student_headers,
        )
        self.assertEqual(result.status_code, 200)
        self.assertTrue(result.json["correct"])

    def test_admin_dashboard_and_analytics_return_live_empty_states(self):
        with self.app.app_context():
            admin_user = create_user(
                self.mongo.database,
                "Test Administrator",
                "admin@example.com",
                "a-different-strong-password",
                role="admin",
            )
            admin_token = issue_token(admin_user)
        headers = {"Authorization": "Bearer " + admin_token}

        dashboard = self.client.get("/api/admin/dashboard", headers=headers)
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.json["stats"]["total_students"], 0)
        self.assertEqual(dashboard.json["stats"]["active_students"], 0)
        self.assertEqual(dashboard.json["stats"]["total_lessons"], 0)

        for path in (
            "/api/admin/analytics",
            "/api/admin/circuits",
            "/api/admin/tutor",
        ):
            with self.subTest(path=path):
                response = self.client.get(path, headers=headers)
                self.assertEqual(response.status_code, 200)

    def test_admin_student_list_never_includes_password_hash(self):
        self.register_student()
        with self.app.app_context():
            admin_user = create_user(
                self.mongo.database,
                "Test Administrator",
                "admin@example.com",
                "a-different-strong-password",
                role="admin",
            )
            admin_token = issue_token(admin_user)

        response = self.client.get(
            "/api/admin/students?search=student&status=active",
            headers={"Authorization": "Bearer " + admin_token},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["total"], 1)
        self.assertEqual(response.json["students"][0]["email"], "student@example.com")
        self.assertNotIn("password_hash", response.json["students"][0])

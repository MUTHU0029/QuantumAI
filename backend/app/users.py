import re
from datetime import datetime, timezone
from uuid import uuid4

from argon2 import PasswordHasher

password_hasher = PasswordHasher()

EMAIL_PATTERN = re.compile(r"[^@\s]+@[^@\s]+\.[^@\s]+")
ALLOWED_ROLES = {"student", "admin"}


class InputValidationError(ValueError):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def normalize_email(value):
    if not isinstance(value, str):
        raise InputValidationError("invalid_email", "Enter a valid email address.")
    email = value.strip().lower()
    if len(email) > 254 or not EMAIL_PATTERN.fullmatch(email):
        raise InputValidationError("invalid_email", "Enter a valid email address.")
    return email


def validate_password(value):
    if not isinstance(value, str) or not 12 <= len(value) <= 128:
        raise InputValidationError(
            "invalid_password",
            "Password must be between 12 and 128 characters.",
        )
    return value


def validate_name(value):
    if (
        not isinstance(value, str)
        or not 1 <= len(value.strip()) <= 100
        or any(ord(character) < 32 for character in value)
    ):
        raise InputValidationError(
            "invalid_name",
            "Name must be between 1 and 100 characters.",
        )
    return value.strip()


def validate_registration(payload):
    if not isinstance(payload, dict):
        raise InputValidationError("invalid_request", "A JSON object is required.")
    if "role" in payload:
        raise InputValidationError(
            "role_not_allowed",
            "Public registration cannot assign a role.",
        )

    return {
        "name": validate_name(payload.get("name")),
        "email": normalize_email(payload.get("email")),
        "password": validate_password(payload.get("password")),
    }


def validate_login(payload):
    if not isinstance(payload, dict):
        raise InputValidationError("invalid_request", "A JSON object is required.")
    email = normalize_email(payload.get("email"))
    password = payload.get("password")
    if not isinstance(password, str) or not 1 <= len(password) <= 1024:
        raise InputValidationError(
            "invalid_credentials",
            "Email address or password is invalid.",
        )
    return email, password


def ensure_user_indexes(database):
    database.users.create_index("email", unique=True, name="unique_user_email")
    database.users.create_index("last_active_at", name="user_last_active")
    database.users.create_index(
        "role",
        unique=True,
        partialFilterExpression={"role": "admin"},
        name="unique_initial_admin",
    )


def create_user(database, name, email, password, role="student"):
    if role not in ALLOWED_ROLES:
        raise ValueError("Unsupported account role.")
    user = {
        "user_id": str(uuid4()),
        "name": name,
        "email": email,
        "password_hash": password_hasher.hash(password),
        "role": role,
        "status": "active",
        "created_at": datetime.now(timezone.utc),
        "last_active_at": None,
    }
    database.users.insert_one(user)
    return user


def public_user(user):
    created_at = user["created_at"].astimezone(timezone.utc)
    return {
        "id": user["user_id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "created_at": created_at.isoformat().replace("+00:00", "Z"),
    }

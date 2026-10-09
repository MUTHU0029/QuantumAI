from datetime import datetime, timezone

from argon2.exceptions import InvalidHashError, VerifyMismatchError
from flask import Blueprint, current_app, g, jsonify, request
from pymongo.errors import DuplicateKeyError, PyMongoError

from ..auth_tokens import issue_token, token_required
from ..errors import api_error
from ..extensions import get_database
from ..users import (
    InputValidationError,
    create_user,
    ensure_user_indexes,
    password_hasher,
    public_user,
    validate_login,
    validate_registration,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
DUMMY_PASSWORD_HASH = password_hasher.hash("nonexistent-account-password")


@auth_bp.post("/register")
def register():
    payload = request.get_json(silent=True)
    try:
        values = validate_registration(payload)
    except InputValidationError as exc:
        return api_error(exc.code, str(exc), 400)

    try:
        database = get_database()
        ensure_user_indexes(database)
        user = create_user(
            database,
            values["name"],
            values["email"],
            values["password"],
            role="student",
        )
    except DuplicateKeyError:
        return api_error("email_already_registered", "Email is already registered.", 409)
    except PyMongoError:
        current_app.logger.exception("User registration database operation failed.")
        return api_error(
            "database_unavailable",
            "Registration is temporarily unavailable.",
            503,
        )

    return jsonify({"user": public_user(user)}), 201


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True)
    try:
        email, password = validate_login(payload)
    except InputValidationError as exc:
        return api_error(exc.code, str(exc), 400)

    try:
        database = get_database()
        user = database.users.find_one({"email": email})
    except PyMongoError:
        current_app.logger.exception("Login database lookup failed.")
        return api_error("database_unavailable", "Login is temporarily unavailable.", 503)

    stored_hash = user["password_hash"] if user else DUMMY_PASSWORD_HASH
    try:
        password_matches = password_hasher.verify(stored_hash, password)
    except VerifyMismatchError:
        password_matches = False
    except InvalidHashError:
        if user:
            current_app.logger.exception("Stored password hash could not be verified.")
        password_matches = False

    if not user or not password_matches:
        return api_error("invalid_credentials", "Email address or password is invalid.", 401)

    if user.get("status", "active") != "active":
        return api_error("account_deactivated", "This account is deactivated.", 403)

    if user.get("role") not in ("student", "admin"):
        current_app.logger.error("User record has an unsupported role.")
        return api_error("account_unavailable", "This account cannot sign in.", 403)

    user["last_active_at"] = datetime.now(timezone.utc)
    try:
        database.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"last_active_at": user["last_active_at"]}},
        )
    except PyMongoError:
        current_app.logger.exception("Could not update last active timestamp.")
        return api_error("database_unavailable", "Login is temporarily unavailable.", 503)
    return jsonify({"token": issue_token(user), "user": public_user(user)}), 200


@auth_bp.get("/me")
@token_required
def me():
    return jsonify({"user": g.auth_user}), 200

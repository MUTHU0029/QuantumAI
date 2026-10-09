from datetime import datetime, timedelta, timezone
from functools import wraps
from uuid import uuid4

import jwt
from flask import current_app, g, request
from jwt.exceptions import PyJWTError
from pymongo.errors import PyMongoError

from .errors import api_error
from .extensions import get_database

JWT_ISSUER = "quantumlearn-api"
VALID_ROLES = {"student", "admin"}


def issue_token(user):
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + timedelta(
        minutes=current_app.config["JWT_EXPIRES_MINUTES"]
    )
    claims = {
        "sub": user["user_id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "iat": issued_at,
        "exp": expires_at,
        "iss": JWT_ISSUER,
        "jti": str(uuid4()),
    }
    return jwt.encode(claims, current_app.config["JWT_SECRET"], algorithm="HS256")


def current_token_user():
    authorization = request.headers.get("Authorization", "")
    scheme, separator, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not separator or not token.strip():
        return None

    try:
        claims = jwt.decode(
            token.strip(),
            current_app.config["JWT_SECRET"],
            algorithms=["HS256"],
            issuer=JWT_ISSUER,
            options={
                "require": ["sub", "name", "email", "role", "iat", "exp", "iss"]
            },
        )
    except PyJWTError:
        return None

    if (
        not isinstance(claims, dict)
        or not isinstance(claims.get("sub"), str)
        or not isinstance(claims.get("name"), str)
        or not isinstance(claims.get("email"), str)
        or not isinstance(claims.get("role"), str)
        or claims.get("role") not in VALID_ROLES
    ):
        return None

    database = get_database()
    database_user = database.users.find_one({"user_id": claims["sub"]})
    if (
        database_user is None
        or database_user.get("role") != claims["role"]
        or database_user.get("status", "active") != "active"
    ):
        return None
    database_user["last_active_at"] = datetime.now(timezone.utc)
    database.users.update_one(
        {"user_id": claims["sub"]},
        {"$set": {"last_active_at": database_user["last_active_at"]}},
    )

    return {
        "id": claims["sub"],
        "name": claims["name"],
        "email": claims["email"],
        "role": claims["role"],
    }


def token_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        try:
            user = current_token_user()
        except PyMongoError:
            current_app.logger.exception("Authentication database lookup failed.")
            return api_error("database_unavailable", "Authentication is temporarily unavailable.", 503)
        if user is None:
            return api_error(
                "authentication_required",
                "A valid bearer token is required.",
                401,
            )
        g.auth_user = user
        return view(*args, **kwargs)

    return wrapped


def roles_required(*allowed_roles):
    def decorator(view):
        @token_required
        @wraps(view)
        def wrapped(*args, **kwargs):
            if g.auth_user["role"] not in allowed_roles:
                return api_error(
                    "insufficient_permissions",
                    "Your account does not have permission to access this resource.",
                    403,
                )
            return view(*args, **kwargs)

        return wrapped

    return decorator

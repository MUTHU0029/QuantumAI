import logging

from flask import Blueprint, current_app, jsonify
from pymongo.errors import PyMongoError

from ..extensions import get_database

health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.get("/health")
def health():
    try:
        get_database().command("ping")
    except PyMongoError:
        current_app.logger.exception("MongoDB health check failed.")
        return (
            jsonify(
                {
                    "error": {
                        "code": "database_unavailable",
                        "message": "Database connectivity check failed.",
                    }
                }
            ),
            503,
        )

    return jsonify({"status": "ok", "database": "connected"}), 200

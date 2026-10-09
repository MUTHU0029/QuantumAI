import logging

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge
from pymongo.errors import PyMongoError

from .admin_cli import register_admin_command
from .config import load_config
from .extensions import init_mongo
from .content import seed_content
from .routes.admin import admin_bp
from .routes.auth import auth_bp
from .routes.dashboards import dashboards_bp
from .routes.health import health_bp
from .routes.simulation import simulation_bp
from .routes.student import student_bp


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.update(load_config())
    app.config["MAX_CONTENT_LENGTH"] = 256 * 1024

    if test_config:
        app.config.update(test_config)

    logging.basicConfig(level=logging.INFO)
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [app.config["FRONTEND_ORIGIN"]],
                "allow_headers": ["Authorization", "Content-Type"],
                "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            }
        },
    )

    init_mongo(app)
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboards_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(simulation_bp)
    app.register_blueprint(admin_bp)
    register_admin_command(app)

    @app.cli.command("seed-content")
    def seed_course_content():
        """Insert the starter lessons and quizzes if those collections are empty."""
        database = app.extensions["mongo_client"][app.config["MONGODB_DATABASE"]]
        seed_content(database)
        print("Starter lessons and quizzes are ready.")

    @app.errorhandler(RequestEntityTooLarge)
    def request_too_large(_error):
        return (
            jsonify(
                {
                    "error": {
                        "code": "request_too_large",
                        "message": "Request body exceeds the 256 KB limit.",
                    }
                }
            ),
            413,
        )

    @app.errorhandler(PyMongoError)
    def database_error(_error):
        app.logger.exception("Unhandled MongoDB operation failed.")
        return (
            jsonify(
                {
                    "error": {
                        "code": "database_unavailable",
                        "message": "The database operation could not be completed.",
                    }
                }
            ),
            503,
        )

    return app

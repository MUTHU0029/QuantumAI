from flask import Blueprint, g, jsonify

from ..auth_tokens import roles_required

dashboards_bp = Blueprint("dashboards", __name__, url_prefix="/api")


@dashboards_bp.get("/student/dashboard")
@roles_required("student")
def student_dashboard():
    return jsonify(
        {
            "message": "Student dashboard access granted.",
            "user": g.auth_user,
        }
    ), 200


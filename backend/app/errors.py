from flask import jsonify


def api_error(code, message, status):
    return (
        jsonify({"error": {"code": code, "message": message}}),
        status,
    )

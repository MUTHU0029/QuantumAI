import os
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv


def load_config():
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")

    mongodb_uri = os.getenv("MONGODB_URI", "").strip()
    mongodb_database = os.getenv("MONGODB_DATABASE", "").strip()
    jwt_secret = os.getenv("JWT_SECRET", "")
    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
    router_model = os.getenv("ROUTER_MODEL", "gemini-3.1-flash-lite").strip()
    frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").strip()

    missing = [
        name
        for name, value in (
            ("MONGODB_URI", mongodb_uri),
            ("MONGODB_DATABASE", mongodb_database),
            ("JWT_SECRET", jwt_secret),
        )
        if not value
    ]
    if missing:
        raise RuntimeError(
            "Missing required environment variable(s): " + ", ".join(missing)
        )

    if len(jwt_secret.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET must contain at least 32 bytes.")
    if jwt_secret.startswith("replace-with-"):
        raise RuntimeError("Replace the JWT_SECRET placeholder with a random secret.")

    parsed_origin = urlsplit(frontend_origin)
    if (
        parsed_origin.scheme not in ("http", "https")
        or not parsed_origin.netloc
        or parsed_origin.path
        or parsed_origin.query
        or parsed_origin.fragment
        or frontend_origin == "*"
    ):
        raise RuntimeError(
            "FRONTEND_ORIGIN must be one exact HTTP(S) origin, without a path."
        )

    try:
        jwt_expires_minutes = int(os.getenv("JWT_EXPIRES_MINUTES", "30"))
    except ValueError as exc:
        raise RuntimeError("JWT_EXPIRES_MINUTES must be a positive integer.") from exc
    if jwt_expires_minutes <= 0:
        raise RuntimeError("JWT_EXPIRES_MINUTES must be a positive integer.")

    return {
        "MONGODB_URI": mongodb_uri,
        "MONGODB_DATABASE": mongodb_database,
        "JWT_SECRET": jwt_secret,
        "GEMINI_API_KEY": gemini_api_key,
        "ROUTER_MODEL": router_model,
        "FRONTEND_ORIGIN": frontend_origin,
        "JWT_EXPIRES_MINUTES": jwt_expires_minutes,
    }

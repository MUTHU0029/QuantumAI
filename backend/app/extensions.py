from flask import current_app
from pymongo import MongoClient


def init_mongo(app):
    app.extensions["mongo_client"] = MongoClient(
        app.config["MONGODB_URI"],
        serverSelectionTimeoutMS=3000,
        connectTimeoutMS=3000,
        tz_aware=True,
    )


def get_database():
    return current_app.extensions["mongo_client"][
        current_app.config["MONGODB_DATABASE"]
    ]

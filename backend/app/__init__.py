from pathlib import Path

from flask import Flask, jsonify, send_from_directory
from marshmallow import ValidationError
from werkzeug.exceptions import HTTPException

from .config import Config
from .extensions import cors, db, migrate
from . import models  # noqa: F401
from .routes import admin_bp, auth_bp, events_bp, me_bp, openapi_bp, organizer_bp


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)

    upload_dir = Path(app.config["UPLOAD_FOLDER"])
    upload_dir.mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)

    app.register_blueprint(auth_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(me_bp)
    app.register_blueprint(organizer_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(openapi_bp)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    @app.errorhandler(ValidationError)
    def validation_error(error):
        return jsonify({"error": "validation_error", "messages": error.messages}), 400

    @app.errorhandler(HTTPException)
    def http_error(error):
        return jsonify({"error": error.name, "message": error.description}), error.code

    @app.errorhandler(Exception)
    def unhandled_error(error):
        app.logger.exception("Unhandled API error", exc_info=error)
        return jsonify({"error": "internal_server_error", "message": "Unexpected server error."}), 500

    return app

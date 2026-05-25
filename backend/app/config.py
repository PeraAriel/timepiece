import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def path_from_env(name, default):
    value = os.getenv(name, default)
    path = Path(value)
    if path.is_absolute():
        return str(path)
    return str(BASE_DIR / path)


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://eventhub:eventhub@localhost:3306/eventhub",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",")
    UPLOAD_FOLDER = path_from_env("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(5 * 1024 * 1024)))

    KEYCLOAK_BASE_URL = os.getenv("KEYCLOAK_BASE_URL", "http://localhost:8080")
    KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "eventhub")
    KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "eventhub-frontend")
    KEYCLOAK_VERIFY_AUDIENCE = os.getenv("KEYCLOAK_VERIFY_AUDIENCE", "false").lower() == "true"
    KEYCLOAK_AUDIENCE = os.getenv("KEYCLOAK_AUDIENCE", KEYCLOAK_CLIENT_ID)
    KEYCLOAK_ADMIN_CLIENT_ID = os.getenv("KEYCLOAK_ADMIN_CLIENT_ID", "")
    KEYCLOAK_ADMIN_CLIENT_SECRET = os.getenv("KEYCLOAK_ADMIN_CLIENT_SECRET", "")

    @property
    def KEYCLOAK_ISSUER(self):
        return f"{self.KEYCLOAK_BASE_URL}/realms/{self.KEYCLOAK_REALM}"


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    WTF_CSRF_ENABLED = False
    KEYCLOAK_BASE_URL = "http://keycloak.test"

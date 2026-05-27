import jwt

import app.routes.auth as auth_routes
from app.extensions import db
from app.models import UserProfile


class StubResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise AssertionError(f"unexpected status {self.status_code}")


def token_for(sub="kc-user-1", email="user@example.test", name="User Example", roles=None):
    roles = roles or ["user"]
    return jwt.encode(
        {
            "sub": sub,
            "email": email,
            "name": name,
            "azp": "eventhub-frontend",
            "realm_access": {"roles": roles},
        },
        key="",
        algorithm="none",
    )


def test_login_rejects_invalid_credentials(client, monkeypatch):
    monkeypatch.setattr(
        auth_routes.requests,
        "post",
        lambda *args, **kwargs: StubResponse(status_code=400, payload={"error": "invalid_grant"}),
    )

    response = client.post(
        "/api/auth/login",
        json={"email": "user@example.test", "password": "wrong-password"},
    )

    assert response.status_code == 401


def test_register_creates_local_profile_and_session(client, monkeypatch):
    class FakeAdminClient:
        configured = True

        def create_user(self, email, password, display_name):
            return "kc-created-user"

        def assign_realm_role(self, keycloak_sub, role_name):
            assert keycloak_sub == "kc-created-user"
            assert role_name == "user"
            return True

    access_token = token_for(sub="kc-created-user", email="new@example.test", name="New User")
    monkeypatch.setattr(auth_routes, "KeycloakAdminClient", FakeAdminClient)
    monkeypatch.setattr(
        auth_routes.requests,
        "post",
        lambda *args, **kwargs: StubResponse(
            payload={
                "access_token": access_token,
                "refresh_token": "refresh-token",
                "expires_in": 300,
                "refresh_expires_in": 1800,
                "token_type": "Bearer",
            }
        ),
    )

    response = client.post(
        "/api/auth/register",
        json={
            "email": "new@example.test",
            "password": "valid-password",
            "display_name": "New User",
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["access_token"] == access_token
    assert payload["refresh_token"] == "refresh-token"
    assert payload["roles"] == ["user"]

    profile = UserProfile.query.filter_by(keycloak_sub="kc-created-user").first()
    assert profile is not None
    assert profile.email == "new@example.test"
    assert profile.display_name == "New User"


def test_register_rejects_duplicate_email(client, monkeypatch):
    db.session.add(
        UserProfile(
            keycloak_sub="existing-user",
            email="dupe@example.test",
            display_name="Existing User",
        )
    )
    db.session.commit()

    class FakeAdminClient:
        configured = True

    monkeypatch.setattr(auth_routes, "KeycloakAdminClient", FakeAdminClient)

    response = client.post(
        "/api/auth/register",
        json={
            "email": "dupe@example.test",
            "password": "valid-password",
            "display_name": "Duplicate",
        },
    )

    assert response.status_code == 409
    assert response.get_json()["error"] == "email_already_registered"


def test_register_requires_keycloak_admin_client(client, monkeypatch):
    class FakeAdminClient:
        configured = False

    monkeypatch.setattr(auth_routes, "KeycloakAdminClient", FakeAdminClient)

    response = client.post(
        "/api/auth/register",
        json={
            "email": "new@example.test",
            "password": "valid-password",
            "display_name": "New User",
        },
    )

    assert response.status_code == 503
    assert response.get_json()["error"] == "auth_admin_not_configured"

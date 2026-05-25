from app.extensions import db
from app.models import UserProfile


def test_profile_can_be_updated_through_api(client, auth_headers):
    response = client.patch(
        "/api/me/profile",
        headers=auth_headers("user-profile"),
        json={"display_name": "Ariel Rossi", "city": "Milano"},
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["display_name"] == "Ariel Rossi"
    assert payload["city"] == "Milano"


def test_profile_rejects_blank_display_name(client, auth_headers):
    response = client.patch(
        "/api/me/profile",
        headers=auth_headers("user-profile"),
        json={"display_name": "", "city": "Milano"},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "validation_error"


def test_profile_rejects_email_update(client, auth_headers):
    response = client.patch(
        "/api/me/profile",
        headers=auth_headers("user-profile"),
        json={
            "display_name": "Ariel Rossi",
            "city": "Milano",
            "email": "new@example.test",
        },
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "validation_error"


def test_auth_sync_does_not_overwrite_local_display_name(client, auth_headers):
    profile = UserProfile(
        keycloak_sub="user-profile",
        email="old@example.test",
        display_name="Nome Locale",
        city="Roma",
    )
    db.session.add(profile)
    db.session.commit()

    response = client.get("/api/me/profile", headers=auth_headers("user-profile"))

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["display_name"] == "Nome Locale"
    assert payload["email"] == "user-profile@example.test"


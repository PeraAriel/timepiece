from datetime import datetime, timezone

from app.extensions import db
from app.models import Event


def test_registration_respects_available_seats(client, auth_headers, future_event):
    first = client.post(f"/api/events/{future_event.id}/register", headers=auth_headers("user-1"))
    assert first.status_code == 201

    second = client.post(f"/api/events/{future_event.id}/register", headers=auth_headers("user-2"))
    assert second.status_code == 409
    assert second.get_json()["error"] == "event_full"


def test_public_event_filters(client, organizer_profile):
    db.session.add(
        Event(
            title="Free Reading",
            description="Book presentation.",
            category="book",
            starts_at=datetime(2026, 8, 1, 18, 0, tzinfo=timezone.utc),
            city="Roma",
            venue="Biblioteca",
            price_cents=0,
            capacity=20,
            organizer_id=organizer_profile.id,
        )
    )
    db.session.commit()

    response = client.get("/api/events?city=Roma&category=book&price_max=0")
    assert response.status_code == 200
    payload = response.get_json()
    assert len(payload["items"]) == 1
    assert payload["items"][0]["title"] == "Free Reading"

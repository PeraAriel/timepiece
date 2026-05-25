from datetime import datetime, timedelta, timezone

import pytest

from app import create_app
from app.config import TestingConfig
from app.extensions import db
from app.models import Event, UserProfile


@pytest.fixture()
def app():
    flask_app = create_app(TestingConfig)
    with flask_app.app_context():
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def auth_headers():
    def build(sub="user-1", roles="user"):
        return {"Authorization": f"Bearer test:{sub}:{roles}"}

    return build


@pytest.fixture()
def organizer_profile(app):
    profile = UserProfile(
        keycloak_sub="organizer-1",
        email="organizer@example.test",
        display_name="Organizer",
    )
    db.session.add(profile)
    db.session.commit()
    return profile


@pytest.fixture()
def future_event(organizer_profile):
    event = Event(
        title="Moonphase Workshop",
        description="Hands-on watchmaking session.",
        category="workshop",
        starts_at=datetime.now(timezone.utc) + timedelta(days=10),
        city="Milano",
        venue="Spazio Tempo",
        price_cents=2500,
        capacity=1,
        organizer_id=organizer_profile.id,
    )
    db.session.add(event)
    db.session.commit()
    return event


@pytest.fixture()
def past_event(organizer_profile):
    event = Event(
        title="Vintage Chronographs",
        description="Talk with collectors.",
        category="talk",
        starts_at=datetime.now(timezone.utc) - timedelta(days=1),
        city="Torino",
        venue="Sala Civica",
        price_cents=0,
        capacity=4,
        organizer_id=organizer_profile.id,
    )
    db.session.add(event)
    db.session.commit()
    return event


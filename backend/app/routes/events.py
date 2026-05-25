from datetime import datetime, timezone
from uuid import uuid4

from flask import Blueprint, g, request
from marshmallow import ValidationError
from sqlalchemy import and_, or_

from ..auth import auth_required
from ..extensions import db
from ..models import Event, Registration, Review
from ..schemas import EventOutputSchema, RegistrationSchema, ReviewInputSchema, ReviewOutputSchema
from ..tasks import send_registration_email_async

bp = Blueprint("events", __name__, url_prefix="/api/events")

event_schema = EventOutputSchema()
events_schema = EventOutputSchema(many=True)
registration_schema = RegistrationSchema()
review_input_schema = ReviewInputSchema()
review_output_schema = ReviewOutputSchema()
reviews_output_schema = ReviewOutputSchema(many=True)


def _event_or_404(event_id):
    return db.get_or_404(Event, event_id)


def _active_registration(user_id, event_id):
    return Registration.query.filter_by(user_id=user_id, event_id=event_id, status="active").first()


def _as_utc(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@bp.get("")
def list_events():
    query = Event.query

    if search := request.args.get("q"):
        pattern = f"%{search}%"
        query = query.filter(or_(Event.title.ilike(pattern), Event.description.ilike(pattern)))
    if category := request.args.get("category"):
        query = query.filter(Event.category == category)
    if city := request.args.get("city"):
        query = query.filter(Event.city == city)
    if price_min := request.args.get("price_min", type=int):
        query = query.filter(Event.price_cents >= price_min)
    if price_max := request.args.get("price_max", type=int):
        query = query.filter(Event.price_cents <= price_max)
    if request.args.get("featured") == "true":
        query = query.filter(Event.is_featured.is_(True))
    if date_from := request.args.get("date_from"):
        query = query.filter(Event.starts_at >= datetime.fromisoformat(date_from))
    if date_to := request.args.get("date_to"):
        query = query.filter(Event.starts_at <= datetime.fromisoformat(date_to))

    events = query.order_by(Event.starts_at.asc()).all()
    return {"items": events_schema.dump(events)}


@bp.get("/<int:event_id>")
def event_detail(event_id):
    return event_schema.dump(_event_or_404(event_id))


@bp.get("/<int:event_id>/reviews")
def list_reviews(event_id):
    _event_or_404(event_id)
    reviews = (
        Review.query.filter_by(event_id=event_id, moderation_status="visible")
        .order_by(Review.created_at.desc())
        .all()
    )
    return {"items": reviews_output_schema.dump(reviews)}


@bp.post("/<int:event_id>/register")
@auth_required
def register_for_event(event_id):
    event = _event_or_404(event_id)
    user = g.current_user.profile
    existing = Registration.query.filter_by(user_id=user.id, event_id=event.id).first()

    if existing and existing.status == "active":
        return registration_schema.dump(existing), 200

    active_count = Registration.query.filter_by(event_id=event.id, status="active").count()
    if active_count >= event.capacity:
        return {"error": "event_full", "message": "No seats available for this event."}, 409

    if existing:
        existing.status = "active"
        existing.qr_payload = f"eventhub:ticket:{event.id}:{user.id}:{uuid4().hex}"
        registration = existing
    else:
        registration = Registration(
            user_id=user.id,
            event_id=event.id,
            qr_payload=f"eventhub:ticket:{event.id}:{user.id}:{uuid4().hex}",
        )
        db.session.add(registration)

    db.session.commit()
    send_registration_email_async(user.email, event.title)
    return registration_schema.dump(registration), 201


@bp.delete("/<int:event_id>/register")
@auth_required
def unregister_from_event(event_id):
    event = _event_or_404(event_id)
    registration = _active_registration(g.current_user.profile.id, event.id)
    if not registration:
        return {"error": "not_registered", "message": "Active registration not found."}, 404

    registration.status = "cancelled"
    db.session.commit()
    return "", 204


@bp.post("/<int:event_id>/reviews")
@auth_required
def create_review(event_id):
    event = _event_or_404(event_id)
    user = g.current_user.profile
    now = datetime.now(timezone.utc)

    if _as_utc(event.starts_at) > now:
        return {"error": "event_not_finished", "message": "Reviews are available after the event."}, 400

    if not _active_registration(user.id, event.id):
        return {"error": "not_registered", "message": "Only registered users can review this event."}, 403

    data = review_input_schema.load(request.get_json() or {})
    existing = Review.query.filter_by(user_id=user.id, event_id=event.id).first()
    if existing:
        existing.rating = data["rating"]
        existing.comment = data["comment"]
        review = existing
    else:
        review = Review(user_id=user.id, event_id=event.id, **data)
        db.session.add(review)

    db.session.commit()
    return review_output_schema.dump(review), 201


@bp.post("/<int:event_id>/reviews/<int:review_id>/report")
@auth_required
def report_review(event_id, review_id):
    review = Review.query.filter(and_(Review.id == review_id, Review.event_id == event_id)).first()
    if not review:
        raise ValidationError({"review": ["Review not found for this event."]})

    review.is_reported = True
    db.session.commit()
    return review_output_schema.dump(review)

from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, UniqueConstraint

from .extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at = db.Column(db.DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class UserProfile(TimestampMixin, db.Model):
    __tablename__ = "user_profiles"

    id = db.Column(db.Integer, primary_key=True)
    keycloak_sub = db.Column(db.String(128), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    display_name = db.Column(db.String(160), nullable=False)
    city = db.Column(db.String(120), nullable=True)
    is_banned = db.Column(db.Boolean, default=False, nullable=False)

    registrations = db.relationship("Registration", back_populates="user", cascade="all, delete-orphan")
    reviews = db.relationship("Review", back_populates="user", cascade="all, delete-orphan")
    organized_events = db.relationship("Event", back_populates="organizer")


class Event(TimestampMixin, db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(180), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(80), nullable=False, index=True)
    starts_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)
    city = db.Column(db.String(120), nullable=False, index=True)
    venue = db.Column(db.String(180), nullable=False)
    price_cents = db.Column(db.Integer, default=0, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    cover_image = db.Column(db.String(255), nullable=True)
    is_featured = db.Column(db.Boolean, default=False, nullable=False)
    organizer_id = db.Column(db.Integer, db.ForeignKey("user_profiles.id"), nullable=True)

    organizer = db.relationship("UserProfile", back_populates="organized_events")
    registrations = db.relationship("Registration", back_populates="event", cascade="all, delete-orphan")
    reviews = db.relationship("Review", back_populates="event", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("capacity > 0", name="ck_events_capacity_positive"),
        CheckConstraint("price_cents >= 0", name="ck_events_price_non_negative"),
    )

    @property
    def active_registrations_count(self):
        return len([registration for registration in self.registrations if registration.status == "active"])

    @property
    def available_seats(self):
        return max(self.capacity - self.active_registrations_count, 0)

    @property
    def average_rating(self):
        visible = [review.rating for review in self.reviews if review.moderation_status == "visible"]
        return round(sum(visible) / len(visible), 2) if visible else None


class Registration(TimestampMixin, db.Model):
    __tablename__ = "registrations"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user_profiles.id"), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False)
    status = db.Column(db.String(20), default="active", nullable=False)
    qr_payload = db.Column(db.String(255), nullable=False)

    user = db.relationship("UserProfile", back_populates="registrations")
    event = db.relationship("Event", back_populates="registrations")

    __table_args__ = (
        UniqueConstraint("user_id", "event_id", name="uq_registration_user_event"),
        CheckConstraint("status in ('active', 'cancelled')", name="ck_registration_status"),
    )


class Review(TimestampMixin, db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user_profiles.id"), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=False)
    is_reported = db.Column(db.Boolean, default=False, nullable=False)
    moderation_status = db.Column(db.String(20), default="visible", nullable=False)

    user = db.relationship("UserProfile", back_populates="reviews")
    event = db.relationship("Event", back_populates="reviews")

    __table_args__ = (
        UniqueConstraint("user_id", "event_id", name="uq_review_user_event"),
        CheckConstraint("rating >= 1 and rating <= 5", name="ck_review_rating"),
        CheckConstraint(
            "moderation_status in ('visible', 'hidden')",
            name="ck_review_moderation_status",
        ),
    )


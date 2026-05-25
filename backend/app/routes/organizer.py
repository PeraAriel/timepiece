import csv
from io import StringIO
from pathlib import Path
from uuid import uuid4

from flask import Blueprint, Response, current_app, g, request
from werkzeug.utils import secure_filename

from ..auth import role_required
from ..extensions import db
from ..models import Event, Registration
from ..schemas import EventInputSchema, EventOutputSchema

bp = Blueprint("organizer", __name__, url_prefix="/api/organizer")

event_input_schema = EventInputSchema()
event_schema = EventOutputSchema()
events_schema = EventOutputSchema(many=True)
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def _owned_event_or_404(event_id):
    event = db.get_or_404(Event, event_id)
    roles = g.current_user.roles
    if "admin" not in roles and event.organizer_id != g.current_user.profile.id:
        return None
    return event


def _forbidden_or_event(event_id):
    event = _owned_event_or_404(event_id)
    if event is None:
        return {"error": "forbidden", "message": "Event is owned by another organizer."}, 403
    return event


@bp.get("/events")
@role_required("organizer")
def list_organizer_events():
    query = Event.query
    if "admin" not in g.current_user.roles:
        query = query.filter_by(organizer_id=g.current_user.profile.id)
    return {"items": events_schema.dump(query.order_by(Event.starts_at.desc()).all())}


@bp.post("/events")
@role_required("organizer")
def create_event():
    data = event_input_schema.load(request.get_json() or {})
    event = Event(**data, organizer_id=g.current_user.profile.id)
    db.session.add(event)
    db.session.commit()
    return event_schema.dump(event), 201


@bp.get("/events/<int:event_id>")
@role_required("organizer")
def get_event(event_id):
    event = _forbidden_or_event(event_id)
    if isinstance(event, tuple):
        return event
    return event_schema.dump(event)


@bp.put("/events/<int:event_id>")
@role_required("organizer")
def update_event(event_id):
    event = _forbidden_or_event(event_id)
    if isinstance(event, tuple):
        return event

    data = event_input_schema.load(request.get_json() or {})
    for field, value in data.items():
        setattr(event, field, value)
    db.session.commit()
    return event_schema.dump(event)


@bp.delete("/events/<int:event_id>")
@role_required("organizer")
def delete_event(event_id):
    event = _forbidden_or_event(event_id)
    if isinstance(event, tuple):
        return event

    db.session.delete(event)
    db.session.commit()
    return "", 204


@bp.post("/events/<int:event_id>/cover")
@role_required("organizer")
def upload_cover(event_id):
    event = _forbidden_or_event(event_id)
    if isinstance(event, tuple):
        return event

    image = request.files.get("image")
    if image is None or not image.filename:
        return {"error": "missing_file", "message": "Upload field 'image' is required."}, 400

    extension = Path(image.filename).suffix.lower()
    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        return {"error": "invalid_file", "message": "Allowed formats: jpg, jpeg, png, webp."}, 400

    safe_name = secure_filename(Path(image.filename).stem)[:80]
    filename = f"{uuid4().hex}-{safe_name}{extension}"
    image.save(Path(current_app.config["UPLOAD_FOLDER"]) / filename)
    event.cover_image = filename
    db.session.commit()
    return event_schema.dump(event)


@bp.get("/events/<int:event_id>/stats")
@role_required("organizer")
def event_stats(event_id):
    event = _forbidden_or_event(event_id)
    if isinstance(event, tuple):
        return event

    active_registrations = [registration for registration in event.registrations if registration.status == "active"]
    return {
        "event_id": event.id,
        "registrations": len(active_registrations),
        "estimated_revenue_cents": len(active_registrations) * event.price_cents,
        "average_rating": event.average_rating,
    }


@bp.get("/events/<int:event_id>/attendees.csv")
@role_required("organizer")
def attendees_csv(event_id):
    event = _forbidden_or_event(event_id)
    if isinstance(event, tuple):
        return event

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["ticket_id", "user_id", "email", "display_name", "status", "created_at"])
    registrations = Registration.query.filter_by(event_id=event.id, status="active").all()
    for registration in registrations:
        writer.writerow(
            [
                registration.id,
                registration.user.id,
                registration.user.email,
                registration.user.display_name,
                registration.status,
                registration.created_at.isoformat(),
            ]
        )

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename=event-{event.id}-attendees.csv"},
    )


from flask import Blueprint, g, request

from ..auth import auth_required
from ..extensions import db
from ..models import Registration
from ..schemas import ProfileSchema, ProfileUpdateSchema, RegistrationSchema

bp = Blueprint("me", __name__, url_prefix="/api/me")

profile_schema = ProfileSchema()
profile_update_schema = ProfileUpdateSchema()
registrations_schema = RegistrationSchema(many=True)


@bp.get("")
@auth_required
def current_user():
    return profile_schema.dump(g.current_user.profile)


@bp.get("/profile")
@auth_required
def profile():
    return profile_schema.dump(g.current_user.profile)


@bp.patch("/profile")
@auth_required
def update_profile():
    data = profile_update_schema.load(request.get_json() or {})
    profile = g.current_user.profile
    for field, value in data.items():
        setattr(profile, field, value)
    db.session.commit()
    return profile_schema.dump(profile)


@bp.get("/tickets")
@auth_required
def tickets():
    registrations = (
        Registration.query.filter_by(user_id=g.current_user.profile.id, status="active")
        .order_by(Registration.created_at.desc())
        .all()
    )
    return {"items": registrations_schema.dump(registrations)}


from flask import Blueprint, g, request

from ..auth import KeycloakAdminClient, role_required
from ..extensions import db
from ..models import Event, Review, UserProfile
from ..schemas import (
    AdminUserUpdateSchema,
    EventInputSchema,
    EventOutputSchema,
    ProfileSchema,
    ReviewOutputSchema,
)

bp = Blueprint("admin", __name__, url_prefix="/api/admin")

users_schema = ProfileSchema(many=True)
user_schema = ProfileSchema()
user_update_schema = AdminUserUpdateSchema()
event_input_schema = EventInputSchema()
event_schema = EventOutputSchema()
reviews_schema = ReviewOutputSchema(many=True)
review_schema = ReviewOutputSchema()


@bp.get("/users")
@role_required("admin")
def list_users():
    users = UserProfile.query.order_by(UserProfile.created_at.desc()).all()
    items = users_schema.dump(users)
    admin_client = KeycloakAdminClient()

    for item, user in zip(items, users):
        roles = []
        if user.keycloak_sub == g.current_user.sub:
            roles = sorted(g.current_user.roles)
        elif admin_client.configured:
            try:
                roles = sorted(admin_client.realm_roles_for_user(user.keycloak_sub))
            except Exception:
                roles = []
        if user.organized_events and "organizer" not in roles:
            roles.append("organizer")
        item["roles"] = sorted(set(roles))

    return {"items": items}


@bp.patch("/users/<int:user_id>")
@role_required("admin")
def update_user(user_id):
    user = db.get_or_404(UserProfile, user_id)
    data = user_update_schema.load(request.get_json() or {})

    promote = data.pop("promote_to_organizer", False)
    for field, value in data.items():
        setattr(user, field, value)

    promotion_status = None
    if promote:
        promoted = KeycloakAdminClient().assign_realm_role(user.keycloak_sub, "organizer")
        promotion_status = "assigned_in_keycloak" if promoted else "keycloak_admin_not_configured"

    db.session.commit()
    payload = user_schema.dump(user)
    if promotion_status:
        payload["promotion_status"] = promotion_status
    return payload


@bp.get("/reviews")
@role_required("admin")
def list_reported_reviews():
    query = Review.query
    if request.args.get("reported", "true") == "true":
        query = query.filter_by(is_reported=True)
    reviews = query.order_by(Review.created_at.desc()).all()
    return {"items": reviews_schema.dump(reviews)}


@bp.patch("/reviews/<int:review_id>")
@role_required("admin")
def moderate_review(review_id):
    review = db.get_or_404(Review, review_id)
    data = request.get_json() or {}
    if "moderation_status" in data:
        if data["moderation_status"] not in {"visible", "hidden"}:
            return {"error": "validation_error", "message": "moderation_status must be visible or hidden."}, 400
        review.moderation_status = data["moderation_status"]
    if "is_reported" in data:
        review.is_reported = bool(data["is_reported"])
    db.session.commit()
    return review_schema.dump(review)


@bp.post("/events")
@role_required("admin")
def create_event():
    data = event_input_schema.load(request.get_json() or {})
    event = Event(**data)
    db.session.add(event)
    db.session.commit()
    return event_schema.dump(event), 201

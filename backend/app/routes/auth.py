import jwt
import requests
from flask import Blueprint, abort, current_app, jsonify, request

from ..auth import KeycloakAdminClient, _extract_roles, _sync_profile
from ..extensions import db
from ..models import UserProfile
from ..schemas import LoginSchema, ProfileSchema, RefreshSchema, RegisterSchema

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _token_url():
    base_url = current_app.config["KEYCLOAK_BASE_URL"].rstrip("/")
    realm = current_app.config["KEYCLOAK_REALM"]
    return f"{base_url}/realms/{realm}/protocol/openid-connect/token"


def _decode_access_token(access_token):
    return jwt.decode(
        access_token,
        options={
            "verify_signature": False,
            "verify_aud": False,
            "verify_exp": False,
        },
    )


def _token_response(token_payload):
    access_token = token_payload["access_token"]
    claims = _decode_access_token(access_token)
    profile = _sync_profile(claims)
    return jsonify(
        {
            "access_token": access_token,
            "refresh_token": token_payload.get("refresh_token"),
            "expires_in": token_payload.get("expires_in"),
            "refresh_expires_in": token_payload.get("refresh_expires_in"),
            "token_type": token_payload.get("token_type", "Bearer"),
            "profile": ProfileSchema().dump(profile),
            "roles": sorted(_extract_roles(claims)),
        }
    )


def _request_token(data):
    response = requests.post(_token_url(), data=data, timeout=10)
    if response.status_code in {400, 401}:
        abort(401, description="Invalid credentials.")
    response.raise_for_status()
    return response.json()


@bp.post("/login")
def login():
    payload = LoginSchema().load(request.get_json() or {})
    token_payload = _request_token(
        {
            "grant_type": "password",
            "client_id": current_app.config["KEYCLOAK_CLIENT_ID"],
            "username": payload["email"],
            "password": payload["password"],
        }
    )
    return _token_response(token_payload)


@bp.post("/register")
def register():
    payload = RegisterSchema().load(request.get_json() or {})
    admin_client = KeycloakAdminClient()
    if not admin_client.configured:
        return jsonify(
            {
                "error": "auth_admin_not_configured",
                "message": "Keycloak admin client is not configured.",
            }
        ), 503

    existing_profile = UserProfile.query.filter_by(email=payload["email"]).first()
    if existing_profile is not None:
        return jsonify({"error": "email_already_registered", "message": "Email already registered."}), 409

    keycloak_sub = admin_client.create_user(
        payload["email"],
        payload["password"],
        payload["display_name"],
    )
    if keycloak_sub is None:
        return jsonify({"error": "email_already_registered", "message": "Email already registered."}), 409

    admin_client.assign_realm_role(keycloak_sub, "user")

    profile = UserProfile.query.filter_by(keycloak_sub=keycloak_sub).first()
    if profile is None:
        profile = UserProfile(
            keycloak_sub=keycloak_sub,
            email=payload["email"],
            display_name=payload["display_name"],
        )
        db.session.add(profile)
    else:
        profile.email = payload["email"]
        profile.display_name = payload["display_name"]
    db.session.commit()

    token_payload = _request_token(
        {
            "grant_type": "password",
            "client_id": current_app.config["KEYCLOAK_CLIENT_ID"],
            "username": payload["email"],
            "password": payload["password"],
        }
    )
    return _token_response(token_payload), 201


@bp.post("/refresh")
def refresh():
    payload = RefreshSchema().load(request.get_json() or {})
    token_payload = _request_token(
        {
            "grant_type": "refresh_token",
            "client_id": current_app.config["KEYCLOAK_CLIENT_ID"],
            "refresh_token": payload["refresh_token"],
        }
    )
    return _token_response(token_payload)

from dataclasses import dataclass
from functools import wraps

import jwt
import requests
from flask import abort, current_app, g, request
from jwt import PyJWKClient

from .extensions import db
from .models import UserProfile


@dataclass(frozen=True)
class AuthContext:
    sub: str
    email: str
    name: str
    roles: set[str]
    claims: dict
    profile: UserProfile


def _issuer():
    return f"{current_app.config['KEYCLOAK_BASE_URL']}/realms/{current_app.config['KEYCLOAK_REALM']}"


def _jwks_url():
    return f"{_issuer()}/protocol/openid-connect/certs"


def _extract_roles(claims):
    client_id = current_app.config["KEYCLOAK_CLIENT_ID"]
    roles = set(claims.get("realm_access", {}).get("roles", []))
    roles.update(claims.get("resource_access", {}).get(client_id, {}).get("roles", []))
    return roles


def _decode_testing_token(token):
    if not token.startswith("test:"):
        return None

    _, sub, role_csv = (token.split(":", 2) + [""])[:3]
    roles = [role for role in role_csv.split(",") if role]
    return {
        "sub": sub,
        "email": f"{sub}@example.test",
        "name": sub.replace("-", " ").title(),
        "realm_access": {"roles": roles},
        "azp": current_app.config["KEYCLOAK_CLIENT_ID"],
        "iss": _issuer(),
    }


def decode_bearer_token():
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        abort(401, description="Missing bearer token.")

    token = header.removeprefix("Bearer ").strip()
    if current_app.config.get("TESTING"):
        claims = _decode_testing_token(token)
        if claims:
            return claims

    jwk_client = PyJWKClient(_jwks_url())
    signing_key = jwk_client.get_signing_key_from_jwt(token)
    options = {"verify_aud": current_app.config["KEYCLOAK_VERIFY_AUDIENCE"]}
    kwargs = {
        "algorithms": ["RS256"],
        "issuer": _issuer(),
        "options": options,
    }
    if current_app.config["KEYCLOAK_VERIFY_AUDIENCE"]:
        kwargs["audience"] = current_app.config["KEYCLOAK_AUDIENCE"]
    claims = jwt.decode(token, signing_key.key, **kwargs)

    authorized_party = claims.get("azp")
    audience = claims.get("aud", [])
    if isinstance(audience, str):
        audience = [audience]
    expected_client = current_app.config["KEYCLOAK_CLIENT_ID"]
    expected_audience = current_app.config["KEYCLOAK_AUDIENCE"]
    if authorized_party != expected_client and expected_audience not in audience:
        abort(401, description="Token was not issued for this application.")

    return claims


def _sync_profile(claims):
    sub = claims.get("sub")
    if not sub:
        abort(401, description="Token is missing subject.")

    email = claims.get("email") or f"{sub}@local.keycloak"
    name = claims.get("name") or claims.get("preferred_username") or email
    profile = UserProfile.query.filter_by(keycloak_sub=sub).first()
    if profile is None:
        profile = UserProfile(keycloak_sub=sub, email=email, display_name=name)
        db.session.add(profile)
    else:
        profile.email = email
        if not profile.display_name:
            profile.display_name = name
    db.session.commit()

    if profile.is_banned:
        abort(403, description="User is banned.")

    return profile


def load_auth_context():
    claims = decode_bearer_token()
    profile = _sync_profile(claims)
    context = AuthContext(
        sub=claims["sub"],
        email=claims.get("email", profile.email),
        name=claims.get("name") or claims.get("preferred_username") or profile.display_name,
        roles=_extract_roles(claims),
        claims=claims,
        profile=profile,
    )
    g.current_user = context
    return context


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        load_auth_context()
        return fn(*args, **kwargs)

    return wrapper


def role_required(*required_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            context = load_auth_context()
            if "admin" not in context.roles and not context.roles.intersection(required_roles):
                abort(403, description="Insufficient role.")
            return fn(*args, **kwargs)

        return wrapper

    return decorator


class KeycloakAdminClient:
    def __init__(self):
        self.base_url = current_app.config["KEYCLOAK_BASE_URL"].rstrip("/")
        self.realm = current_app.config["KEYCLOAK_REALM"]
        self.client_id = current_app.config["KEYCLOAK_ADMIN_CLIENT_ID"]
        self.client_secret = current_app.config["KEYCLOAK_ADMIN_CLIENT_SECRET"]

    @property
    def configured(self):
        return bool(self.client_id and self.client_secret)

    def _token(self):
        response = requests.post(
            f"{self.base_url}/realms/{self.realm}/protocol/openid-connect/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
            timeout=10,
        )
        response.raise_for_status()
        return response.json()["access_token"]

    def assign_realm_role(self, keycloak_sub, role_name):
        if not self.configured:
            return False

        headers = {"Authorization": f"Bearer {self._token()}"}
        role_response = requests.get(
            f"{self.base_url}/admin/realms/{self.realm}/roles/{role_name}",
            headers=headers,
            timeout=10,
        )
        role_response.raise_for_status()
        role = role_response.json()

        assign_response = requests.post(
            f"{self.base_url}/admin/realms/{self.realm}/users/{keycloak_sub}/role-mappings/realm",
            headers={**headers, "Content-Type": "application/json"},
            json=[role],
            timeout=10,
        )
        assign_response.raise_for_status()
        return True

    def realm_roles_for_user(self, keycloak_sub):
        if not self.configured:
            return []

        headers = {"Authorization": f"Bearer {self._token()}"}
        response = requests.get(
            f"{self.base_url}/admin/realms/{self.realm}/users/{keycloak_sub}/role-mappings/realm",
            headers=headers,
            timeout=10,
        )
        response.raise_for_status()
        return [role["name"] for role in response.json()]

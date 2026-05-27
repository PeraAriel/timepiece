from .admin import bp as admin_bp
from .auth import bp as auth_bp
from .events import bp as events_bp
from .me import bp as me_bp
from .organizer import bp as organizer_bp
from .openapi import bp as openapi_bp

__all__ = ["admin_bp", "auth_bp", "events_bp", "me_bp", "organizer_bp", "openapi_bp"]

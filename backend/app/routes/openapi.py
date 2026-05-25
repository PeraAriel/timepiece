from flask import Blueprint

bp = Blueprint("openapi", __name__)


@bp.get("/api/openapi.json")
def openapi_json():
    return {
        "openapi": "3.0.3",
        "info": {"title": "EventHub API", "version": "1.0.0"},
        "security": [{"bearerAuth": []}],
        "components": {
            "securitySchemes": {
                "bearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
            }
        },
        "paths": {
            "/api/events": {
                "get": {"summary": "List public events"},
            },
            "/api/events/{eventId}": {
                "get": {"summary": "Get event detail"},
            },
            "/api/events/{eventId}/register": {
                "post": {"summary": "Register current user for an event"},
                "delete": {"summary": "Cancel current user's registration"},
            },
            "/api/events/{eventId}/reviews": {
                "get": {"summary": "List visible event reviews"},
                "post": {"summary": "Create or update current user's review"},
            },
            "/api/me/profile": {
                "get": {"summary": "Get current EventHub profile"},
                "patch": {"summary": "Update EventHub profile display name and city"},
            },
            "/api/me/tickets": {
                "get": {"summary": "List current user's active tickets"},
            },
            "/api/organizer/events": {
                "get": {"summary": "List organizer events"},
                "post": {"summary": "Create organizer event"},
            },
            "/api/organizer/events/{eventId}/cover": {
                "post": {"summary": "Upload event cover image"},
            },
            "/api/organizer/events/{eventId}/stats": {
                "get": {"summary": "Get organizer dashboard stats for an event"},
            },
            "/api/organizer/events/{eventId}/attendees.csv": {
                "get": {"summary": "Export active attendees CSV"},
            },
            "/api/admin/users": {
                "get": {"summary": "List local user profiles"},
            },
            "/api/admin/reviews": {
                "get": {"summary": "List reported reviews"},
            },
            "/api/admin/events": {
                "post": {"summary": "Create event as admin"},
            },
        },
    }


@bp.get("/api/docs")
def swagger_ui():
    return """
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>EventHub API Docs</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui' });
        </script>
      </body>
    </html>
    """

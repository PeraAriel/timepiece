from io import BytesIO
from base64 import b64encode

import qrcode
from marshmallow import Schema, ValidationError, fields, post_dump, validate, validates


class EventInputSchema(Schema):
    title = fields.Str(required=True)
    description = fields.Str(required=True)
    category = fields.Str(required=True)
    starts_at = fields.DateTime(required=True)
    city = fields.Str(required=True)
    venue = fields.Str(required=True)
    price_cents = fields.Int(load_default=0)
    capacity = fields.Int(required=True)
    is_featured = fields.Bool(load_default=False)

    @validates("capacity")
    def validate_capacity(self, value):
        if value <= 0:
            raise ValidationError("Capacity must be greater than zero.")

    @validates("price_cents")
    def validate_price(self, value):
        if value < 0:
            raise ValidationError("Price cannot be negative.")


class EventOutputSchema(Schema):
    id = fields.Int()
    title = fields.Str()
    description = fields.Str()
    category = fields.Str()
    starts_at = fields.DateTime()
    city = fields.Str()
    venue = fields.Str()
    price_cents = fields.Int()
    capacity = fields.Int()
    cover_image = fields.Str(allow_none=True)
    is_featured = fields.Bool()
    organizer_id = fields.Int(allow_none=True)
    available_seats = fields.Method("get_available_seats")
    average_rating = fields.Method("get_average_rating")

    def get_available_seats(self, obj):
        return obj.available_seats

    def get_average_rating(self, obj):
        return obj.average_rating

    @post_dump
    def add_cover_url(self, data, **kwargs):
        if data.get("cover_image"):
            data["cover_url"] = f"/uploads/{data['cover_image']}"
        return data


class RegistrationSchema(Schema):
    id = fields.Int()
    status = fields.Str()
    qr_payload = fields.Str()
    qr_code_data_url = fields.Method("get_qr_code_data_url")
    event = fields.Nested(EventOutputSchema)
    created_at = fields.DateTime()

    def get_qr_code_data_url(self, obj):
        image = qrcode.make(obj.qr_payload)
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        encoded = b64encode(buffer.getvalue()).decode("ascii")
        return f"data:image/png;base64,{encoded}"


class ReviewInputSchema(Schema):
    rating = fields.Int(required=True)
    comment = fields.Str(required=True)

    @validates("rating")
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise ValidationError("Rating must be between 1 and 5.")


class ReviewOutputSchema(Schema):
    id = fields.Int()
    rating = fields.Int()
    comment = fields.Str()
    is_reported = fields.Bool()
    moderation_status = fields.Str()
    user_id = fields.Int()
    event_id = fields.Int()
    created_at = fields.DateTime()


class ProfileSchema(Schema):
    id = fields.Int()
    keycloak_sub = fields.Str()
    email = fields.Email()
    display_name = fields.Str()
    city = fields.Str(allow_none=True)
    is_banned = fields.Bool()


class ProfileUpdateSchema(Schema):
    display_name = fields.Str(required=True, validate=validate.Length(min=1, max=160))
    city = fields.Str(allow_none=True, validate=validate.Length(max=120))


class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=1))


class RegisterSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=8))
    display_name = fields.Str(required=True, validate=validate.Length(min=1, max=160))


class RefreshSchema(Schema):
    refresh_token = fields.Str(required=True, validate=validate.Length(min=1))


class AdminUserUpdateSchema(Schema):
    display_name = fields.Str(validate=validate.Length(min=1, max=160))
    city = fields.Str(allow_none=True, validate=validate.Length(max=120))
    is_banned = fields.Bool()
    promote_to_organizer = fields.Bool(load_default=False)

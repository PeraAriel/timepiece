def test_organizer_area_requires_organizer_role(client, auth_headers):
    forbidden = client.get("/api/organizer/events", headers=auth_headers("user-1", "user"))
    assert forbidden.status_code == 403

    allowed = client.get("/api/organizer/events", headers=auth_headers("organizer-1", "organizer"))
    assert allowed.status_code == 200


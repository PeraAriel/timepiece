def test_review_is_blocked_before_event_finishes(client, auth_headers, future_event):
    client.post(f"/api/events/{future_event.id}/register", headers=auth_headers("user-1"))

    response = client.post(
        f"/api/events/{future_event.id}/reviews",
        headers=auth_headers("user-1"),
        json={"rating": 5, "comment": "Great setup."},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "event_not_finished"


def test_registered_user_can_review_past_event(client, auth_headers, past_event):
    client.post(f"/api/events/{past_event.id}/register", headers=auth_headers("user-1"))

    response = client.post(
        f"/api/events/{past_event.id}/reviews",
        headers=auth_headers("user-1"),
        json={"rating": 4, "comment": "Useful and well paced."},
    )

    assert response.status_code == 201
    assert response.get_json()["rating"] == 4


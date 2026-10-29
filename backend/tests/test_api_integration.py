import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"

def test_profile_lifecycle(client):
    # GET profile
    r = client.get("/api/v1/profile")
    assert r.status_code == 200
    data = r.json()
    assert "user_id" in data
    assert "interests" in data

    # PUT profile
    r = client.put("/api/v1/profile", json={
        "display_name": "Alex Chen Test",
        "career_goal": "AI Systems Architect",
        "experience_level": "intermediate",
        "interests": ["AI agents", "LLMs", "FastAPI"],
        "current_skills": ["python", "git", "rest-apis"],
        "weekly_study_minutes": 420
    })
    assert r.status_code == 200
    updated = r.json()
    assert updated["display_name"] == "Alex Chen Test"
    assert updated["experience_level"] == "intermediate"

def test_discoveries_feed_and_scoring(client):
    r = client.get("/api/v1/discoveries?page=1&limit=10")
    assert r.status_code == 200
    feed = r.json()
    assert "items" in feed
    assert feed["total"] > 0
    assert feed["live_count"] >= 0
    assert feed["seeded_count"] >= 0

    first = feed["items"][0]
    assert "id" in first
    assert "title" in first
    assert "evidence_level" in first
    assert first["evidence_level"] in ["New", "Emerging"]
    assert first["score"] is not None
    assert first["score_reason"] is not None
    assert "is_seeded" in first

def test_discovery_detail(client):
    r_feed = client.get("/api/v1/discoveries?page=1&limit=1")
    first_id = r_feed.json()["items"][0]["id"]

    r = client.get(f"/api/v1/discoveries/{first_id}")
    assert r.status_code == 200
    detail = r.json()
    assert detail["id"] == first_id
    assert "applications" in detail
    assert "evidence" in detail
    assert len(detail["evidence"]) >= 1
    # Check that source URL is preserved
    assert detail["evidence"][0]["canonical_url"].startswith("http")

def test_save_and_dismiss_discovery(client):
    r_feed = client.get("/api/v1/discoveries?page=1&limit=5")
    item = r_feed.json()["items"][0]
    item_id = item["id"]

    # Save
    r = client.post(f"/api/v1/discoveries/{item_id}/actions", json={"action": "saved"})
    assert r.status_code == 200
    assert r.json()["state"] == "saved"

    # Verify appears in /saved
    r_saved = client.get("/api/v1/saved")
    assert r_saved.status_code == 200
    saved_ids = [d["id"] for d in r_saved.json()]
    assert item_id in saved_ids

    # Dismiss another item
    other_id = r_feed.json()["items"][1]["id"]
    r_dismiss = client.post(f"/api/v1/discoveries/{other_id}/actions", json={"action": "dismissed"})
    assert r_dismiss.status_code == 200
    assert r_dismiss.json()["state"] == "dismissed"

    # Verify dismissed item is excluded from feed (T3.4)
    r_feed_after = client.get("/api/v1/discoveries?page=1&limit=100")
    feed_ids = [d["id"] for d in r_feed_after.json()["items"]]
    assert other_id not in feed_ids

def test_roadmaps_and_prerequisites(client):
    r = client.get("/api/v1/roadmaps")
    assert r.status_code == 200
    roadmaps = r.json()
    assert len(roadmaps) > 0
    road_id = roadmaps[0]["id"]

    r_detail = client.get(f"/api/v1/roadmaps/{road_id}")
    assert r_detail.status_code == 200
    detail = r_detail.json()
    items = detail["items"]
    assert len(items) > 0

    # Verify known skills marked Done (T3.12, AGENTS.md Rule 25)
    # python and rest-apis are known skills of the student
    slug_status_map = {it["slug"]: it["status"] for it in items}
    if "python" in slug_status_map:
        assert slug_status_map["python"] == "done"

    # Verify verified resources are included
    for item in items:
        for res in item["resources"]:
            assert res["url"].startswith("http")
            assert res["is_verified"] is True

def test_security_reject_query_string_user_id(client):
    """PRD §7 & AGENTS.md Rule 19: Never trust a user_id from a query string."""
    r = client.get("/api/v1/profile?user_id=00000000-0000-0000-0000-000000000002")
    assert r.status_code == 400
    assert "forbidden" in r.json()["detail"].lower()

def test_security_admin_token_protection(client):
    """PRD §8 & AGENTS.md Rule 18: Ingestion is never an unprotected public endpoint."""
    # Without token -> 403
    r = client.post("/api/v1/admin/ingest", json={"source": "all"})
    assert r.status_code == 403

    # With invalid token -> 403
    r = client.post(
        "/api/v1/admin/ingest",
        json={"source": "all"},
        headers={"X-Admin-Token": "wrong-token"}
    )
    assert r.status_code == 403

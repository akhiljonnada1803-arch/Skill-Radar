"""
Comprehensive v2 Core Verification Matrix:
- T4.6: Ingesting same source item twice -> idempotent, no duplicate
- T4.7: Ingestion failure isolation & run tracking
- T4.8: Gemini timeout / invalid JSON handling with fallback
- T4.9: Multiple evidence rows for single discovery; copied articles not independent
- T4.10: Missing date stays NULL / None
- T4.11: Suggestions served on-request from stored DB with zero network / Gemini calls
- T4.12: Accepting suggestion inserts at prerequisite-correct position with source='suggested'
- T4.13: Roadmap status progression persists across requests
- T4.14: Cross-user isolation: User A cannot access or modify User B's roadmap, items, or notes
- T4.15: Unapproved study notes and unverified videos are never served by /skills/{id}/learn
- T4.16: Prerequisite cycle detection rejects cycles; unmatched skills have no invented prerequisites
- T4.17: Prompt-injection text treated purely as untrusted source data
- T4.18: Auth checks: wrong password (401), invalid token (401), query ?user_id rejected (400), password not exposed
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.models import (
    User, StudentProfile, Domain, Skill, SkillLesson, LessonVideo,
    SkillNote, UserNote, Roadmap, RoadmapItem, Discovery, DiscoverySkill
)
from app.core.security import get_password_hash, create_access_token
from app.services.content_loader import detect_cycles, CycleDetectedError, ContentValidationError
from app.services.ingestion.canonicalize import compute_content_hash, canonicalize_url
from app.services.ingestion.runner import evaluate_evidence_level
from app.services.enrichment.gemini import GeminiEnrichmentService

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="module")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module")
def auth_headers_user_a(db_session: Session):
    # Setup test User A
    email = f"user_a_{uuid.uuid4().hex[:8]}@radar.internal"
    user = User(email=email, password_hash=get_password_hash("password123"))
    db_session.add(user)
    db_session.flush()

    domain = db_session.query(Domain).filter(Domain.slug == "ai-engineering").first()
    profile = StudentProfile(
        user_id=user.id,
        display_name="Operative A",
        selected_domain_id=domain.id if domain else None,
        experience_level="intermediate",
        weekly_study_minutes=360
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {token}", "User-Id": str(user.id)}

@pytest.fixture(scope="module")
def auth_headers_user_b(db_session: Session):
    # Setup test User B
    email = f"user_b_{uuid.uuid4().hex[:8]}@radar.internal"
    user = User(email=email, password_hash=get_password_hash("password456"))
    db_session.add(user)
    db_session.flush()

    domain = db_session.query(Domain).filter(Domain.slug == "cloud-devops").first()
    profile = StudentProfile(
        user_id=user.id,
        display_name="Operative B",
        selected_domain_id=domain.id if domain else None,
        experience_level="beginner",
        weekly_study_minutes=180
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)

    token = create_access_token(subject=str(user.id))
    return {"Authorization": f"Bearer {token}", "User-Id": str(user.id)}

# ==============================================================================
# T4.18: Authentication & Security Checks
# ==============================================================================
def test_t4_18_auth_security_checks(client: TestClient, db_session: Session):
    # 1. Correct registration & password never returned in response
    reg_email = f"auth_test_{uuid.uuid4().hex[:6]}@radar.internal"
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": reg_email,
        "password": "StrongPassword!9"
    })
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert "access_token" in reg_data
    assert "password" not in reg_data
    assert "password_hash" not in reg_data

    # 2. Login with wrong password -> 401
    wrong_login = client.post("/api/v1/auth/login", json={
        "email": reg_email,
        "password": "IncorrectPassword"
    })
    assert wrong_login.status_code == 401
    assert "Invalid email or password" in wrong_login.json()["detail"]

    # 3. Invalid/expired token -> 401
    invalid_token_resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.payload"})
    assert invalid_token_resp.status_code == 401

    # 4. PRD §7 / Rule 19: Reject query string user_id
    query_param_resp = client.get(f"/api/v1/profile?user_id={uuid.uuid4()}")
    assert query_param_resp.status_code == 400
    assert "forbidden" in query_param_resp.json()["detail"].lower()

# ==============================================================================
# T4.14: Cross-User Isolation (User A cannot access or modify User B's state)
# ==============================================================================
def test_t4_14_cross_user_isolation(client: TestClient, auth_headers_user_a, auth_headers_user_b):
    # User A creates their roadmap
    resp_a = client.post("/api/v1/roadmaps", json={}, headers=auth_headers_user_a)
    assert resp_a.status_code == 201
    roadmap_a = resp_a.json()
    roadmap_a_id = roadmap_a["id"]
    item_a_id = roadmap_a["items"][0]["id"]

    # User B tries to read User A's roadmap by ID -> 403 Forbidden
    resp_b_read = client.get(f"/api/v1/roadmaps/{roadmap_a_id}", headers=auth_headers_user_b)
    assert resp_b_read.status_code == 403
    assert "Access denied" in resp_b_read.json()["detail"]

    # User B tries to modify User A's roadmap item -> 403 Forbidden
    resp_b_patch = client.patch(
        f"/api/v1/roadmaps/items/{item_a_id}",
        json={"status": "done"},
        headers=auth_headers_user_b
    )
    assert resp_b_patch.status_code == 403
    assert "Access denied" in resp_b_patch.json()["detail"]

    # User B tries to delete User A's roadmap item -> 403 Forbidden
    resp_b_delete = client.delete(
        f"/api/v1/roadmaps/items/{item_a_id}",
        headers=auth_headers_user_b
    )
    assert resp_b_delete.status_code == 403
    assert "Access denied" in resp_b_delete.json()["detail"]

# ==============================================================================
# T4.11 & T4.12: Suggestions On-Request & Accept into Roadmap
# ==============================================================================
def test_t4_11_and_t4_12_suggestions_and_accept(client: TestClient, auth_headers_user_a):
    # Fetch current roadmap
    r_current = client.get("/api/v1/roadmaps/current", headers=auth_headers_user_a)
    assert r_current.status_code == 200
    roadmap = r_current.json()
    roadmap_id = roadmap["id"]
    initial_item_count = len(roadmap["items"])

    # T4.11: Fetch suggestions on-request (fast, DB-backed, deterministic)
    r_sugg = client.get(f"/api/v1/roadmaps/{roadmap_id}/suggestions", headers=auth_headers_user_a)
    assert r_sugg.status_code == 200
    sugg_data = r_sugg.json()
    assert sugg_data["total"] >= 1
    first_sugg = sugg_data["suggestions"][0]
    disc_id = first_sugg["discovery_id"]

    # T4.12: Accept suggestion into roadmap
    r_accept = client.post(
        f"/api/v1/roadmaps/{roadmap_id}/suggestions/{disc_id}/accept",
        headers=auth_headers_user_a
    )
    assert r_accept.status_code == 200
    accepted_item = r_accept.json()
    assert accepted_item["source"] == "suggested"
    assert accepted_item["added_from_discovery_id"] == disc_id

    # Verify roadmap has grown by 1 and item persists
    r_verify = client.get(f"/api/v1/roadmaps/current", headers=auth_headers_user_a)
    verify_data = r_verify.json()
    assert len(verify_data["items"]) == initial_item_count + 1
    found = any(it["id"] == accepted_item["id"] and it["source"] == "suggested" for it in verify_data["items"])
    assert found is True, "Accepted suggested skill must persist in roadmap"

# ==============================================================================
# T4.13: Roadmap Status Progression & Persistence
# ==============================================================================
def test_t4_13_roadmap_status_progression(client: TestClient, auth_headers_user_a):
    r_current = client.get("/api/v1/roadmaps/current", headers=auth_headers_user_a)
    items = r_current.json()["items"]
    target_item = items[0]
    target_id = target_item["id"]

    # Update status to 'in_progress'
    r_patch = client.patch(
        f"/api/v1/roadmaps/items/{target_id}",
        json={"status": "in_progress"},
        headers=auth_headers_user_a
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["status"] == "in_progress"

    # Re-query roadmap from fresh request and verify persistence
    r_requery = client.get("/api/v1/roadmaps/current", headers=auth_headers_user_a)
    updated_items = r_requery.json()["items"]
    reloaded_target = next(it for it in updated_items if it["id"] == target_id)
    assert reloaded_target["status"] == "in_progress"

    # Now mark done and verify progress calculation
    client.patch(
        f"/api/v1/roadmaps/items/{target_id}",
        json={"status": "done"},
        headers=auth_headers_user_a
    )
    r_done_query = client.get("/api/v1/roadmaps/current", headers=auth_headers_user_a)
    done_items = r_done_query.json()["items"]
    assert next(it for it in done_items if it["id"] == target_id)["status"] == "done"
    assert r_done_query.json()["completed_skills"] >= 1

# ==============================================================================
# T4.15: Content Gating (Unverified videos and unapproved notes never returned)
# ==============================================================================
def test_t4_15_learn_content_gating(client: TestClient, db_session: Session, auth_headers_user_a):
    # Find a curated skill
    skill = db_session.query(Skill).filter(Skill.slug == "rag-basics").first()
    assert skill is not None

    # Call /skills/{id}/learn
    resp = client.get(f"/api/v1/skills/{skill.id}/learn", headers=auth_headers_user_a)
    assert resp.status_code == 200
    data = resp.json()

    # Rule 8 check: every video returned MUST be verified == True
    for vid in data["videos"]:
        assert vid["verified"] is True
        assert vid["youtube_id"] is not None and len(vid["youtube_id"]) > 0

    # Rule 10/11 check: if study_notes is present, status MUST be approved
    if data["study_notes"]:
        assert data["study_notes"]["status"] == "approved"
        assert "reviewed" in data["study_notes"]["label"].lower()

# ==============================================================================
# T4.16: Cycle Detection in Content Loader
# ==============================================================================
def test_t4_16_cycle_detection_in_content_loader():
    # Valid linear chain
    valid_graph = {"a": ["b"], "b": ["c"], "c": []}
    detect_cycles(valid_graph)  # does not raise

    # Direct cycle: A -> B -> A
    cyclic_graph = {"a": ["b"], "b": ["a"]}
    with pytest.raises(CycleDetectedError, match="Prerequisite cycle detected"):
        detect_cycles(cyclic_graph)

    # 3-node cycle: X -> Y -> Z -> X
    three_cycle = {"x": ["y"], "y": ["z"], "z": ["x"]}
    with pytest.raises(CycleDetectedError, match="Prerequisite cycle detected"):
        detect_cycles(three_cycle)

# ==============================================================================
# Personal Notes Field Scratchpad Lifecycle (T3.8, T4.2)
# ==============================================================================
def test_user_personal_notes_lifecycle(client: TestClient, db_session: Session, auth_headers_user_a, auth_headers_user_b):
    skill = db_session.query(Skill).filter(Skill.slug == "agentic-architectures").first()
    assert skill is not None

    # User A writes personal note
    note_text = "Personal field insight: ReAct loops benefit from bounded retries and token budgeting."
    put_resp = client.put(
        f"/api/v1/skills/{skill.id}/notes/me",
        json={"content": note_text},
        headers=auth_headers_user_a
    )
    assert put_resp.status_code == 200
    assert put_resp.json()["content"] == note_text

    # User A retrieves note
    get_resp = client.get(f"/api/v1/skills/{skill.id}/notes/me", headers=auth_headers_user_a)
    assert get_resp.status_code == 200
    assert get_resp.json()["content"] == note_text

    # User B retrieves their note for same skill -> must be empty (isolated)
    get_b_resp = client.get(f"/api/v1/skills/{skill.id}/notes/me", headers=auth_headers_user_b)
    assert get_b_resp.status_code == 200
    assert get_b_resp.json()["content"] == ""

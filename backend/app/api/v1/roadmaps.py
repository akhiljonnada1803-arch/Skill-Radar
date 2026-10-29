import uuid
from datetime import datetime, timezone
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models import (
    Roadmap, RoadmapItem, Skill, SkillPrerequisite,
    Domain, StudentProfile, Discovery, UserDiscoveryState, DiscoverySkill
)
from app.schemas import (
    RoadmapDetailResponse, RoadmapItemResponse, RoadmapCreateRequest,
    RoadmapItemUpdate, SuggestionsResponse, SuggestionItem, RoadmapSummary,
    ResourceItem
)
from app.services.roadmap import order_roadmap_items, create_roadmap_from_domain, insert_accepted_skill
from app.services.suggestions import get_roadmap_suggestions

router = APIRouter(prefix="/roadmaps", tags=["Roadmaps"])

def _build_roadmap_response(roadmap: Roadmap, db: Session) -> RoadmapDetailResponse:
    items = db.query(RoadmapItem).filter(
        RoadmapItem.roadmap_id == roadmap.id
    ).order_by(RoadmapItem.position.asc()).all()

    skill_ids = [it.skill_id for it in items]
    skills_by_id = {s.id: s for s in db.query(Skill).filter(Skill.id.in_(skill_ids)).all()} if skill_ids else {}

    # Prerequisites map
    prereqs_rows = db.query(SkillPrerequisite).filter(
        SkillPrerequisite.skill_id.in_(skill_ids)
    ).all() if skill_ids else []

    prereq_skill_ids = [r.prerequisite_id for r in prereqs_rows]
    prereq_skills_by_id = {s.id: s for s in db.query(Skill).filter(Skill.id.in_(prereq_skill_ids)).all()} if prereq_skill_ids else {}

    prereq_slugs_by_skill_id = {}
    for r in prereqs_rows:
        if r.prerequisite_id in prereq_skills_by_id:
            prereq_slugs_by_skill_id.setdefault(r.skill_id, []).append(prereq_skills_by_id[r.prerequisite_id].slug)

    item_responses = []
    completed_count = 0
    for it in items:
        skill = skills_by_id.get(it.skill_id)
        if it.status == "done":
            completed_count += 1
        resources_list = []
        if skill and skill.resources:
            resources_list = [
                ResourceItem(
                    id=r.id,
                    title=r.title,
                    url=r.url,
                    resource_type=r.resource_type or "article",
                    provider=r.provider,
                    is_verified=r.is_verified,
                    mini_project=r.mini_project
                )
                for r in skill.resources
            ]

        item_responses.append(RoadmapItemResponse(
            id=it.id,
            skill_id=it.skill_id,
            slug=skill.slug if skill else "unknown",
            name=skill.name if skill else "Unknown Skill",
            difficulty=skill.difficulty if skill else "beginner",
            status=it.status,
            position=it.position,
            source=it.source,
            added_from_discovery_id=it.added_from_discovery_id,
            prerequisites=prereq_slugs_by_skill_id.get(it.skill_id, []),
            resources=resources_list
        ))

    return RoadmapDetailResponse(
        id=roadmap.id,
        domain_id=roadmap.domain_id,
        domain_name=roadmap.domain.name if roadmap.domain else None,
        title=roadmap.title,
        total_skills=len(items),
        completed_skills=completed_count,
        items=item_responses
    )

@router.get("", response_model=List[RoadmapSummary])
def get_user_roadmaps(
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    roadmaps = db.query(Roadmap).filter(Roadmap.user_id == user_id).all()
    results = []
    for r in roadmaps:
        items = r.items or []
        done = sum(1 for i in items if i.status == "done")
        results.append(RoadmapSummary(
            id=r.id,
            title=r.title,
            created_at=r.created_at,
            total_items=len(items),
            completed_items=done,
            total_skills=len(items),
            completed_skills=done
        ))
    return results

@router.get("/current", response_model=RoadmapDetailResponse)
def get_current_roadmap(
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    roadmap = db.query(Roadmap).filter(Roadmap.user_id == user_id).first()
    if not roadmap:
        # Check student profile for selected domain
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
        domain_id = profile.selected_domain_id if profile and profile.selected_domain_id else None
        if not domain_id:
            default_domain = db.query(Domain).filter(Domain.slug == "ai-engineering").first()
            if not default_domain:
                default_domain = db.query(Domain).first()
            if default_domain:
                domain_id = default_domain.id

        if domain_id:
            roadmap = create_roadmap_from_domain(db, user_id, domain_id)
        else:
            roadmap = Roadmap(user_id=user_id, title="My Roadmap")
            db.add(roadmap)
            db.commit()
            db.refresh(roadmap)

    return _build_roadmap_response(roadmap, db)

@router.post("", response_model=RoadmapDetailResponse, status_code=status.HTTP_201_CREATED)
def create_or_switch_roadmap(
    payload: Optional[RoadmapCreateRequest] = None,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Support both {"domain_id": "..."} and legacy {"title": "..."}
    domain_id = None
    if isinstance(payload, dict):
        domain_id = payload.get("domain_id")
    elif hasattr(payload, "domain_id"):
        domain_id = payload.domain_id

    if domain_id:
        try:
            domain_uuid = uuid.UUID(str(domain_id))
            roadmap = create_roadmap_from_domain(db, user_id, domain_uuid)
            return _build_roadmap_response(roadmap, db)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid domain ID")

    # Fallback to existing or first domain
    default_domain = db.query(Domain).first()
    if default_domain:
        roadmap = create_roadmap_from_domain(db, user_id, default_domain.id)
        return _build_roadmap_response(roadmap, db)

    roadmap = Roadmap(user_id=user_id, title="My Roadmap")
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)
    return _build_roadmap_response(roadmap, db)

@router.get("/{roadmap_id}", response_model=RoadmapDetailResponse)
def get_roadmap_by_id(
    roadmap_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found")
    # Ownership check (T3.9, T4.14)
    if roadmap.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this roadmap")
    return _build_roadmap_response(roadmap, db)

@router.patch("/items/{item_id}", response_model=RoadmapItemResponse)
def update_roadmap_item(
    item_id: uuid.UUID,
    payload: RoadmapItemUpdate,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    item = db.query(RoadmapItem).filter(RoadmapItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap item not found")

    # Ownership check
    if item.roadmap.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this roadmap item")

    if payload.status is not None:
        item.status = payload.status
    if payload.position is not None:
        item.position = payload.position
    if payload.notes is not None:
        item.notes = payload.notes

    db.commit()
    db.refresh(item)

    skill = item.skill
    prereqs = [p.slug for p in skill.prerequisites] if skill else []

    return RoadmapItemResponse(
        id=item.id,
        skill_id=item.skill_id,
        slug=skill.slug if skill else "unknown",
        name=skill.name if skill else "Unknown Skill",
        difficulty=skill.difficulty if skill else "beginner",
        status=item.status,
        position=item.position,
        source=item.source,
        added_from_discovery_id=item.added_from_discovery_id,
        prerequisites=prereqs
    )

@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_roadmap_item(
    item_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    item = db.query(RoadmapItem).filter(RoadmapItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap item not found")

    # Ownership check
    if item.roadmap.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this roadmap item")

    db.delete(item)
    db.commit()
    return None

@router.get("/{roadmap_id}/suggestions", response_model=SuggestionsResponse)
def get_suggestions(
    roadmap_id: uuid.UUID,
    limit: int = 20,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found")
    # Ownership check
    if roadmap.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this roadmap")

    # On request only, served from stored enriched discoveries (T3.4, T4.11)
    suggestions = get_roadmap_suggestions(db, roadmap_id=roadmap.id, user_id=user_id, limit=limit)
    return SuggestionsResponse(
        total=len(suggestions),
        suggestions=suggestions
    )

@router.post("/{roadmap_id}/suggestions/{discovery_id}/accept", response_model=RoadmapItemResponse)
def accept_suggestion(
    roadmap_id: uuid.UUID,
    discovery_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found")
    # Ownership check
    if roadmap.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this roadmap")

    discovery = db.query(Discovery).filter(Discovery.id == discovery_id).first()
    if not discovery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discovery not found")

    # Find skill linked to discovery, or create/link a standalone skill
    disc_skill = db.query(DiscoverySkill).filter(DiscoverySkill.discovery_id == discovery.id).first()
    if disc_skill:
        skill = disc_skill.skill
    else:
        # Check if skill with slug exists
        slug = discovery.title.lower().replace(" ", "-")[:40]
        skill = db.query(Skill).filter(Skill.slug == slug).first()
        if not skill:
            skill = Skill(
                slug=slug,
                name=discovery.title[:80],
                description=discovery.summary,
                category=discovery.category or "Technology",
                difficulty="intermediate",
                is_curated=False
            )
            db.add(skill)
            db.flush()

    # Insert into roadmap at prerequisite-correct position
    item = insert_accepted_skill(db, roadmap, skill, discovery_id=discovery.id)

    # Record accepted state in user_discovery_state
    user_state = db.query(UserDiscoveryState).filter(
        UserDiscoveryState.user_id == user_id,
        UserDiscoveryState.discovery_id == discovery.id
    ).first()
    if not user_state:
        user_state = UserDiscoveryState(
            user_id=user_id,
            discovery_id=discovery.id,
            state="accepted"
        )
        db.add(user_state)
    else:
        user_state.state = "accepted"

    db.commit()
    db.refresh(item)

    prereqs = [p.slug for p in skill.prerequisites] if skill.prerequisites else []
    return RoadmapItemResponse(
        id=item.id,
        skill_id=item.skill_id,
        slug=skill.slug,
        name=skill.name,
        difficulty=skill.difficulty,
        status=item.status,
        position=item.position,
        source=item.source,
        added_from_discovery_id=item.added_from_discovery_id,
        prerequisites=prereqs
    )

@router.post("/{roadmap_id}/suggestions/{discovery_id}/dismiss")
def dismiss_suggestion(
    roadmap_id: uuid.UUID,
    discovery_id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    roadmap = db.query(Roadmap).filter(Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Roadmap not found")
    if roadmap.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this roadmap")

    user_state = db.query(UserDiscoveryState).filter(
        UserDiscoveryState.user_id == user_id,
        UserDiscoveryState.discovery_id == discovery_id
    ).first()
    if not user_state:
        user_state = UserDiscoveryState(
            user_id=user_id,
            discovery_id=discovery_id,
            state="dismissed"
        )
        db.add(user_state)
    else:
        user_state.state = "dismissed"

    db.commit()
    return {"status": "ok", "state": "dismissed"}

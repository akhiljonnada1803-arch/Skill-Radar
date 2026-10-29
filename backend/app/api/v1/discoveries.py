import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models import (
    Discovery, DiscoveryEvidence, DiscoverySkill, Skill,
    UserDiscoveryState, StudentProfile, SourceItem, Source
)
from app.schemas import (
    DiscoveriesFeedResponse, DiscoveryCard, DiscoveryDetail,
    DiscoveryActionRequest, DiscoveryActionResponse, SourceInfo,
    EvidenceDetail, RelatedSkillItem
)
from app.services.ranking import calculate_relevance

router = APIRouter(tags=["Discoveries"])

@router.get("/discoveries", response_model=DiscoveriesFeedResponse)
def get_discoveries(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    filter: Optional[str] = Query("all", pattern="^(all|live|seeded)$"),
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()

    # Find dismissed IDs to exclude (T3.4)
    dismissed_ids = set(
        row[0] for row in db.query(UserDiscoveryState.discovery_id).filter(
            UserDiscoveryState.user_id == user_id,
            UserDiscoveryState.state == "dismissed"
        ).all()
    )

    # Saved states map
    user_states = dict(
        db.query(UserDiscoveryState.discovery_id, UserDiscoveryState.state).filter(
            UserDiscoveryState.user_id == user_id
        ).all()
    )

    # Base query
    query = db.query(Discovery).filter(
        Discovery.status == "enriched",
        ~Discovery.id.in_(dismissed_ids) if dismissed_ids else True
    )

    if filter == "live":
        query = query.filter(Discovery.is_seeded == False)
    elif filter == "seeded":
        query = query.filter(Discovery.is_seeded == True)

    all_discoveries = query.all()

    # Compute live & seeded counts across all available
    live_count = db.query(func.count(Discovery.id)).filter(
        Discovery.status == "enriched",
        Discovery.is_seeded == False,
        ~Discovery.id.in_(dismissed_ids) if dismissed_ids else True
    ).scalar() or 0

    seeded_count = db.query(func.count(Discovery.id)).filter(
        Discovery.status == "enriched",
        Discovery.is_seeded == True,
        ~Discovery.id.in_(dismissed_ids) if dismissed_ids else True
    ).scalar() or 0

    # Score and rank discoveries deterministically
    scored_items = []
    for disc in all_discoveries:
        linked_skills = [ds.skill for ds in disc.skills if ds.skill]
        score, reason = calculate_relevance(disc, profile, linked_skills)

        # Get primary source info
        primary_ev = (
            db.query(DiscoveryEvidence)
            .filter(DiscoveryEvidence.discovery_id == disc.id, DiscoveryEvidence.evidence_role == "primary")
            .first()
        )
        source_info = None
        if primary_ev and primary_ev.source_item:
            s_item = primary_ev.source_item
            source_name = s_item.source.name if s_item.source else "Public Source"
            source_info = SourceInfo(
                source_name=source_name,
                canonical_url=s_item.canonical_url,
                published_at=s_item.published_at,
                author_publisher=s_item.author_publisher
            )

        card = DiscoveryCard(
            id=disc.id,
            title=disc.title,
            summary=disc.summary,
            category=disc.category,
            discovery_type=disc.discovery_type or "paper",
            applications=disc.applications or [],
            why_it_matters=disc.why_it_matters,
            evidence_level=disc.evidence_level,
            is_seeded=disc.is_seeded,
            score=score,
            score_reason=reason,
            created_at=disc.created_at,
            primary_source=source_info,
            user_state=user_states.get(disc.id)
        )
        scored_items.append((score, card))

    # Deterministic ranking by score descending, then created_at descending
    scored_items.sort(key=lambda x: (x[0], x[1].created_at), reverse=True)

    # Paginate
    total = len(scored_items)
    start_idx = (page - 1) * limit
    paged_cards = [item[1] for item in scored_items[start_idx : start_idx + limit]]

    return DiscoveriesFeedResponse(
        items=paged_cards,
        total=total,
        page=page,
        limit=limit,
        live_count=live_count,
        seeded_count=seeded_count
    )

@router.get("/discoveries/{id}", response_model=DiscoveryDetail)
def get_discovery_detail(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    disc = db.query(Discovery).filter(Discovery.id == id).first()
    if not disc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discovery not found")

    # Evidence details
    ev_records = db.query(DiscoveryEvidence).filter(DiscoveryEvidence.discovery_id == id).all()
    evidence_list: List[EvidenceDetail] = []
    for ev in ev_records:
        if ev.source_item:
            s_item = ev.source_item
            s_name = s_item.source.name if s_item.source else "Public Source"
            evidence_list.append(EvidenceDetail(
                source_item_id=s_item.id,
                source_name=s_name,
                canonical_url=s_item.canonical_url,
                title=s_item.title,
                author_publisher=s_item.author_publisher,
                published_at=s_item.published_at,
                evidence_role=ev.evidence_role
            ))

    # Related skills
    skills_list: List[RelatedSkillItem] = []
    for ds in disc.skills:
        if ds.skill:
            skills_list.append(RelatedSkillItem(
                id=ds.skill.id,
                slug=ds.skill.slug,
                name=ds.skill.name,
                relevance=float(ds.relevance),
                relationship_type=ds.relationship_type,
                difficulty=ds.skill.difficulty,
                is_in_roadmap=False
            ))

    user_state = db.query(UserDiscoveryState.state).filter(
        UserDiscoveryState.user_id == user_id,
        UserDiscoveryState.discovery_id == id
    ).scalar()

    return DiscoveryDetail(
        id=disc.id,
        title=disc.title,
        summary=disc.summary,
        category=disc.category,
        discovery_type=disc.discovery_type or "paper",
        applications=disc.applications or [],
        why_it_matters=disc.why_it_matters,
        evidence_level=disc.evidence_level,
        is_seeded=disc.is_seeded,
        created_at=disc.created_at,
        evidence=evidence_list,
        related_skills=skills_list,
        user_state=user_state
    )

@router.post("/discoveries/{id}/actions", response_model=DiscoveryActionResponse)
def set_discovery_action(
    id: uuid.UUID,
    payload: DiscoveryActionRequest,
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    disc = db.query(Discovery).filter(Discovery.id == id).first()
    if not disc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discovery not found")

    user_state = db.query(UserDiscoveryState).filter(
        UserDiscoveryState.user_id == user_id,
        UserDiscoveryState.discovery_id == id
    ).first()

    now = datetime.now(timezone.utc)

    desired_action = payload.action or payload.state
    if not desired_action:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must provide action or state")

    if desired_action == "none":
        if user_state:
            db.delete(user_state)
            db.commit()
        return DiscoveryActionResponse(discovery_id=id, state=None, updated_at=now)

    if not user_state:
        user_state = UserDiscoveryState(
            user_id=user_id,
            discovery_id=id,
            state=desired_action,
            updated_at=now
        )
        db.add(user_state)
    else:
        user_state.state = desired_action
        user_state.updated_at = now

    db.commit()
    return DiscoveryActionResponse(discovery_id=id, state=user_state.state, updated_at=user_state.updated_at)

@router.get("/saved", response_model=List[DiscoveryCard])
def get_saved_discoveries(
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    saved_records = (
        db.query(Discovery)
        .join(UserDiscoveryState, UserDiscoveryState.discovery_id == Discovery.id)
        .filter(UserDiscoveryState.user_id == user_id, UserDiscoveryState.state == "saved")
        .order_by(UserDiscoveryState.updated_at.desc())
        .all()
    )

    results = []
    for disc in saved_records:
        primary_ev = (
            db.query(DiscoveryEvidence)
            .filter(DiscoveryEvidence.discovery_id == disc.id, DiscoveryEvidence.evidence_role == "primary")
            .first()
        )
        source_info = None
        if primary_ev and primary_ev.source_item:
            s_item = primary_ev.source_item
            source_info = SourceInfo(
                source_name=s_item.source.name if s_item.source else "Source",
                canonical_url=s_item.canonical_url,
                published_at=s_item.published_at,
                author_publisher=s_item.author_publisher
            )

        results.append(DiscoveryCard(
            id=disc.id,
            title=disc.title,
            summary=disc.summary,
            category=disc.category,
            discovery_type=disc.discovery_type or "paper",
            applications=disc.applications or [],
            why_it_matters=disc.why_it_matters,
            evidence_level=disc.evidence_level,
            is_seeded=disc.is_seeded,
            score=0.90,
            score_reason="Saved in your collection",
            created_at=disc.created_at,
            primary_source=source_info,
            user_state="saved"
        ))

    return results

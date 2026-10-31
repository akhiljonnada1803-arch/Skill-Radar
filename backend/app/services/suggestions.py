"""
Suggestions Engine (v2)
AGENTS.md Rule 21, 22:
- On request only, reads pre-enriched stored discoveries.
- NO external fetches, NO Gemini calls during request.
- Deterministic and explainable ranking with short score_reason.
- Distinguishes live vs seeded data.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import (
    Roadmap, RoadmapItem, Discovery, DiscoverySkill,
    DiscoveryEvidence, SourceItem, Source, UserDiscoveryState,
    Skill, StudentProfile, Domain
)
from app.schemas import SuggestionItem, SourceLink

def get_roadmap_suggestions(
    db: Session,
    roadmap_id: uuid.UUID,
    user_id: uuid.UUID,
    limit: int = 20
) -> List[SuggestionItem]:
    roadmap = db.query(Roadmap).filter(
        Roadmap.id == roadmap_id,
        Roadmap.user_id == user_id
    ).first()
    if not roadmap:
        return []

    # Get skills already in the user's roadmap
    roadmap_skill_ids = set(
        row.skill_id for row in db.query(RoadmapItem.skill_id).filter(
            RoadmapItem.roadmap_id == roadmap.id
        ).all()
    )

    # Get dismissed or already accepted discovery IDs for this user
    handled_disc_ids = set(
        row.discovery_id for row in db.query(UserDiscoveryState.discovery_id).filter(
            UserDiscoveryState.user_id == user_id,
            UserDiscoveryState.state.in_(["dismissed", "accepted"])
        ).all()
    )

    # Student profile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    domain_slug = roadmap.domain.slug if roadmap.domain else None

    # Query enriched discoveries
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=90)
    discoveries = db.query(Discovery).filter(
        Discovery.status.in_(["enriched", "pending"]),
        ~Discovery.id.in_(handled_disc_ids) if handled_disc_ids else True
    ).order_by(Discovery.created_at.desc()).limit(100).all()

    scored_items: List[Dict[str, Any]] = []

    for disc in discoveries:
        # Check if discovery skills overlap with roadmap skills
        disc_skills = db.query(DiscoverySkill).filter(DiscoverySkill.discovery_id == disc.id).all()
        disc_skill_ids = [ds.skill_id for ds in disc_skills]

        # If all associated skills are already in roadmap, skip
        if disc_skill_ids and all(sid in roadmap_skill_ids for sid in disc_skill_ids):
            continue

        # Find primary source item to extract published date, source type, and URL
        primary_evidence = db.query(DiscoveryEvidence).filter(
            DiscoveryEvidence.discovery_id == disc.id,
            DiscoveryEvidence.evidence_role == "primary"
        ).first()

        source_item = primary_evidence.source_item if primary_evidence else None
        published_at = source_item.published_at if source_item else None

        # Determine source type label (PAPER vs RELEASE)
        source_type = "PAPER"
        if source_item and source_item.source:
            if source_item.source.source_type in ["release_feed", "rss", "github"]:
                source_type = "RELEASE"
        elif disc.discovery_type in ["release", "repository"]:
            source_type = "RELEASE"

        # Evidence links
        all_evidence = db.query(DiscoveryEvidence).filter(DiscoveryEvidence.discovery_id == disc.id).all()
        source_links: List[SourceLink] = []
        for ev in all_evidence:
            if ev.source_item:
                source_links.append(SourceLink(
                    title=ev.source_item.title[:60],
                    url=ev.source_item.canonical_url
                ))

        # Primary skill name & slug for suggestion (prioritize skills NOT already in roadmap)
        target_skill = None
        for ds in disc_skills:
            if ds.skill_id not in roadmap_skill_ids:
                found_sk = db.query(Skill).filter(Skill.id == ds.skill_id).first()
                if found_sk:
                    target_skill = found_sk
                    break
        if not target_skill and disc_skills:
            target_skill = db.query(Skill).filter(Skill.id == disc_skills[0].skill_id).first()

        skill_slug = target_skill.slug if target_skill else disc.title.lower().replace(" ", "-")[:40]
        skill_name = target_skill.name if target_skill else disc.title[:50]

        # Deterministic scoring formula (T0.7)
        # Domain match score
        s_domain = 0.5
        if domain_slug and disc.category and (domain_slug.lower() in disc.category.lower() or "ai" in disc.category.lower()):
            s_domain = 1.0

        # Overlap score with roadmap
        s_overlap = 0.4
        matched_roadmap_skill = False
        for sid in disc_skill_ids:
            if sid in roadmap_skill_ids:
                s_overlap = 0.9
                matched_roadmap_skill = True
                break

        # Recency score
        s_recency = 0.5
        if published_at:
            pub_aware = published_at if published_at.tzinfo else published_at.replace(tzinfo=timezone.utc)
            days_old = (datetime.now(timezone.utc) - pub_aware).days
            if days_old <= 14:
                s_recency = 1.0
            elif days_old <= 45:
                s_recency = 0.8
            else:
                s_recency = 0.6

        # Evidence score
        s_evidence = 1.0 if disc.evidence_level == "Emerging" else 0.5

        # Final score
        score = round((0.40 * s_domain) + (0.30 * s_overlap) + (0.15 * s_recency) + (0.15 * s_evidence), 3)

        # Deterministic reason string
        reasons = []
        if matched_roadmap_skill:
            reasons.append("Extends foundational skills in your active roadmap")
        elif s_domain == 1.0:
            reasons.append(f"Highly relevant for {roadmap.domain.name if roadmap.domain else 'your domain'}")

        if disc.evidence_level == "Emerging":
            reasons.append("corroborated by multiple industry sources")
        elif source_type == "RELEASE":
            reasons.append("official model/tooling release")
        else:
            reasons.append("new research publication")

        score_reason = "; ".join(reasons).capitalize() + "."

        scored_items.append({
            "discovery_id": disc.id,
            "skill_slug": skill_slug,
            "skill_name": skill_name,
            "title": disc.title,
            "summary": disc.summary or (disc.applications[0] if disc.applications else ""),
            "source_type": source_type,
            "evidence_level": disc.evidence_level.upper(),
            "score": score,
            "score_reason": score_reason,
            "published_at": published_at,
            "is_seeded": disc.is_seeded,
            "source_links": source_links
        })

    # Sort deterministically by score descending
    scored_items.sort(key=lambda x: x["score"], reverse=True)

    return [SuggestionItem(**item) for item in scored_items[:limit]]

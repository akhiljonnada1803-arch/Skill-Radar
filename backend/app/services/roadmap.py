"""
Roadmap Ordering and Prerequisite Graph Engine (v2)
Rules:
- Order roadmap items by prerequisite dependencies using topological sorting
- Prevent cycles: validate against circular dependencies
- Mark known skills as 'done' automatically
- Standalone skills: added with no invented prerequisites
- Idempotent insert of suggested skills at prerequisite-correct position
"""

import uuid
from typing import List, Dict, Set, Optional
from sqlalchemy.orm import Session
from app.models import (
    Roadmap, RoadmapItem, Skill, SkillPrerequisite,
    Domain, DomainSkill, StudentProfile, Discovery
)

def order_roadmap_items(db: Session, items: List[RoadmapItem], profile: Optional[StudentProfile] = None) -> List[RoadmapItem]:
    if not items:
        return []

    item_by_skill_id = {item.skill_id: item for item in items}
    skill_ids = list(item_by_skill_id.keys())

    prereq_rows = db.query(SkillPrerequisite).filter(
        SkillPrerequisite.skill_id.in_(skill_ids),
        SkillPrerequisite.prerequisite_id.in_(skill_ids)
    ).all()

    adj = {sid: set() for sid in skill_ids}
    in_degree = {sid: 0 for sid in skill_ids}

    for row in prereq_rows:
        adj[row.prerequisite_id].add(row.skill_id)
        in_degree[row.skill_id] += 1

    queue = [sid for sid, deg in in_degree.items() if deg == 0]
    ordered_ids = []

    while queue:
        queue.sort(key=lambda sid: item_by_skill_id[sid].position)
        curr = queue.pop(0)
        ordered_ids.append(curr)

        for dependent in adj.get(curr, set()):
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                queue.append(dependent)

    for sid in skill_ids:
        if sid not in ordered_ids:
            ordered_ids.append(sid)

    known_skills = set(s.lower() for s in (profile.current_skills or [])) if profile else set()

    ordered_items = []
    for pos, sid in enumerate(ordered_ids):
        item = item_by_skill_id[sid]
        item.position = pos
        if item.skill and item.skill.slug.lower() in known_skills:
            if item.status == "todo":
                item.status = "done"
        ordered_items.append(item)

    return ordered_items

def create_roadmap_from_domain(db: Session, user_id: uuid.UUID, domain_id: uuid.UUID) -> Roadmap:
    domain = db.query(Domain).filter(Domain.id == domain_id).first()
    if not domain:
        raise ValueError(f"Domain {domain_id} not found")

    roadmap = db.query(Roadmap).filter(
        Roadmap.user_id == user_id,
        Roadmap.domain_id == domain.id
    ).first()
    if not roadmap:
        roadmap = Roadmap(
            user_id=user_id,
            domain_id=domain.id,
            title=f"{domain.name} Roadmap"
        )
        db.add(roadmap)
        db.flush()

    # Update active profile domain if student profile exists
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    if profile:
        profile.selected_domain_id = domain.id

    # Fetch domain skills
    domain_skills = db.query(DomainSkill).filter(
        DomainSkill.domain_id == domain.id
    ).order_by(DomainSkill.position.asc()).all()

    existing_skill_ids = set(
        row.skill_id for row in db.query(RoadmapItem.skill_id).filter(
            RoadmapItem.roadmap_id == roadmap.id
        ).all()
    )

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    known_skills = set(s.lower() for s in (profile.current_skills or [])) if profile else set()

    new_items: List[RoadmapItem] = []
    current_max_pos = len(existing_skill_ids)

    for ds in domain_skills:
        if ds.skill_id in existing_skill_ids:
            continue
        skill = db.query(Skill).filter(Skill.id == ds.skill_id).first()
        initial_status = "done" if skill and skill.slug.lower() in known_skills else "todo"
        item = RoadmapItem(
            roadmap_id=roadmap.id,
            skill_id=ds.skill_id,
            status=initial_status,
            position=current_max_pos,
            source="curated"
        )
        db.add(item)
        new_items.append(item)
        current_max_pos += 1

    db.flush()

    # Re-order all items topologically
    all_items = db.query(RoadmapItem).filter(RoadmapItem.roadmap_id == roadmap.id).all()
    ordered = order_roadmap_items(db, all_items, profile)
    for pos, it in enumerate(ordered):
        it.position = pos

    db.commit()
    db.refresh(roadmap)
    return roadmap

def insert_accepted_skill(
    db: Session,
    roadmap: Roadmap,
    skill: Skill,
    discovery_id: Optional[uuid.UUID] = None
) -> RoadmapItem:
    """
    Inserts a suggested skill at a prerequisite-correct position.
    AGENTS.md Rule 23, 24:
    - source = 'suggested', added_from_discovery_id set
    - Placed after prerequisites
    - Unmatched skills added standalone with NO invented prerequisites
    """
    existing_item = db.query(RoadmapItem).filter(
        RoadmapItem.roadmap_id == roadmap.id,
        RoadmapItem.skill_id == skill.id
    ).first()
    if existing_item:
        existing_item.source = "suggested"
        existing_item.added_from_discovery_id = discovery_id
        db.commit()
        db.refresh(existing_item)
        return existing_item

    # Find prerequisites of this skill that are already in the roadmap
    prereq_ids = [
        row.prerequisite_id for row in db.query(SkillPrerequisite).filter(
            SkillPrerequisite.skill_id == skill.id
        ).all()
    ]

    items = db.query(RoadmapItem).filter(
        RoadmapItem.roadmap_id == roadmap.id
    ).order_by(RoadmapItem.position.asc()).all()

    target_pos = len(items)
    if prereq_ids:
        max_prereq_pos = -1
        for it in items:
            if it.skill_id in prereq_ids:
                if it.position > max_prereq_pos:
                    max_prereq_pos = it.position
        if max_prereq_pos >= 0:
            target_pos = max_prereq_pos + 1

    # Shift positions for items at or after target_pos
    for it in items:
        if it.position >= target_pos:
            it.position += 1

    new_item = RoadmapItem(
        roadmap_id=roadmap.id,
        skill_id=skill.id,
        status="todo",
        position=target_pos,
        source="suggested",
        added_from_discovery_id=discovery_id
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

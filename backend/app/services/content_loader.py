import os
import json
import logging
from typing import Dict, List, Set, Any
from datetime import datetime, date
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import (
    Domain, Skill, DomainSkill, SkillPrerequisite,
    SkillLesson, LessonVideo
)

logger = logging.getLogger("skillradar.content_loader")
logging.basicConfig(level=logging.INFO)

class ContentValidationError(Exception):
    pass

class CycleDetectedError(ContentValidationError):
    pass

def detect_cycles(prereq_graph: Dict[str, List[str]]):
    """
    Detect cycles in skill prerequisites using Depth-First Search with coloring.
    0: unvisited, 1: visiting (in current stack), 2: visited
    """
    state = {node: 0 for node in prereq_graph}

    def dfs(node: str, path: List[str]):
        state[node] = 1
        path.append(node)
        for neighbor in prereq_graph.get(node, []):
            if neighbor not in state:
                continue
            if state[neighbor] == 1:
                cycle_path = " -> ".join(path + [neighbor])
                raise CycleDetectedError(f"Prerequisite cycle detected: {cycle_path}")
            if state[neighbor] == 0:
                dfs(neighbor, path)
        path.pop()
        state[node] = 2

    for node in prereq_graph:
        if state[node] == 0:
            dfs(node, [])

def load_and_validate_content(content_dir: str):
    domains_file = os.path.join(content_dir, "domains.json")
    if not os.path.exists(domains_file):
        raise ContentValidationError(f"Domains file not found: {domains_file}")

    with open(domains_file, "r", encoding="utf-8") as f:
        domains_data = json.load(f)

    domain_slugs = {d["slug"]: d for d in domains_data}

    skills_dir = os.path.join(content_dir, "skills")
    if not os.path.exists(skills_dir):
        raise ContentValidationError(f"Skills directory not found: {skills_dir}")

    skills_data: List[Dict[str, Any]] = []
    seen_slugs: Set[str] = set()

    for filename in sorted(os.listdir(skills_dir)):
        if filename.endswith(".json"):
            path = os.path.join(skills_dir, filename)
            with open(path, "r", encoding="utf-8") as f:
                skill = json.load(f)

            slug = skill.get("slug")
            if not slug:
                raise ContentValidationError(f"Missing 'slug' in {path}")
            if slug in seen_slugs:
                raise ContentValidationError(f"Duplicate skill slug detected: '{slug}' in {path}")
            seen_slugs.add(slug)

            domain_slug = skill.get("domain_slug")
            if domain_slug not in domain_slugs:
                raise ContentValidationError(f"Skill '{slug}' references unknown domain '{domain_slug}'")

            # Validate video fields & gate
            for v in skill.get("videos", []):
                if not v.get("verified", False):
                    raise ContentValidationError(
                        f"Refusing unverified video '{v.get('title')}' in skill '{slug}'. All videos must be verified by curator."
                    )
                if not v.get("youtube_id") or not v.get("title") or not v.get("channel"):
                    raise ContentValidationError(
                        f"Video in skill '{slug}' is missing required fields (youtube_id, title, channel)"
                    )

            skills_data.append(skill)

    # Validate prerequisites
    prereq_graph: Dict[str, List[str]] = {}
    for skill in skills_data:
        slug = skill["slug"]
        prereqs = skill.get("prerequisites", [])
        prereq_graph[slug] = []
        for p in prereqs:
            if p not in seen_slugs:
                raise ContentValidationError(
                    f"Skill '{slug}' references non-existent prerequisite '{p}'"
                )
            if p == slug:
                raise ContentValidationError(
                    f"Skill '{slug}' cannot have itself as a prerequisite"
                )
            prereq_graph[slug].append(p)

    # Cycle check
    detect_cycles(prereq_graph)

    return domains_data, skills_data

def import_content_to_db(db: Session, content_dir: str) -> Dict[str, int]:
    domains_data, skills_data = load_and_validate_content(content_dir)

    # 1. Upsert Domains
    domain_map: Dict[str, Domain] = {}
    domains_imported = 0
    for d in domains_data:
        domain = db.query(Domain).filter(Domain.slug == d["slug"]).first()
        if not domain:
            domain = Domain(
                slug=d["slug"],
                name=d["name"],
                description=d.get("description"),
                icon=d.get("icon", "book")
            )
            db.add(domain)
            db.flush()
            domains_imported += 1
        else:
            domain.name = d["name"]
            domain.description = d.get("description")
            domain.icon = d.get("icon", "book")
        domain_map[d["slug"]] = domain

    # 2. Upsert Skills
    skill_map: Dict[str, Skill] = {}
    skills_imported = 0
    for s in skills_data:
        skill = db.query(Skill).filter(Skill.slug == s["slug"]).first()
        if not skill:
            skill = Skill(
                slug=s["slug"],
                name=s["name"],
                category=s.get("domain_slug"),
                difficulty=s.get("domain_tier", "beginner"),
                is_curated=True
            )
            db.add(skill)
            db.flush()
            skills_imported += 1
        else:
            skill.name = s["name"]
            skill.category = s.get("domain_slug")
            skill.difficulty = s.get("domain_tier", "beginner")
            skill.is_curated = True
        skill_map[s["slug"]] = skill

    # 3. Domain-Skill links & ordering
    domain_skill_positions: Dict[str, int] = {}
    for s in skills_data:
        domain = domain_map[s["domain_slug"]]
        skill = skill_map[s["slug"]]
        pos = domain_skill_positions.get(domain.slug, 0)
        domain_skill_positions[domain.slug] = pos + 1

        ds = db.query(DomainSkill).filter(
            DomainSkill.domain_id == domain.id,
            DomainSkill.skill_id == skill.id
        ).first()
        if not ds:
            ds = DomainSkill(
                domain_id=domain.id,
                skill_id=skill.id,
                position=pos
            )
            db.add(ds)
        else:
            ds.position = pos

    # 4. Prerequisites
    for s in skills_data:
        skill = skill_map[s["slug"]]
        for p_slug in s.get("prerequisites", []):
            prereq_skill = skill_map[p_slug]
            exists = db.query(SkillPrerequisite).filter(
                SkillPrerequisite.skill_id == skill.id,
                SkillPrerequisite.prerequisite_id == prereq_skill.id
            ).first()
            if not exists:
                link = SkillPrerequisite(
                    skill_id=skill.id,
                    prerequisite_id=prereq_skill.id
                )
                db.add(link)

    # 5. Skill Lessons & Verified Videos
    for s in skills_data:
        skill = skill_map[s["slug"]]

        lesson = db.query(SkillLesson).filter(SkillLesson.skill_id == skill.id).first()
        if not lesson:
            lesson = SkillLesson(
                skill_id=skill.id,
                overview=s.get("overview", ""),
                mini_project=s.get("mini_project", "")
            )
            db.add(lesson)
        else:
            lesson.overview = s.get("overview", "")
            lesson.mini_project = s.get("mini_project", "")

        # Videos (only verified)
        for idx, v in enumerate(s.get("videos", [])):
            if not v.get("verified", False):
                continue
            video = db.query(LessonVideo).filter(
                LessonVideo.skill_id == skill.id,
                LessonVideo.youtube_id == v["youtube_id"]
            ).first()
            verified_date = None
            if v.get("verified_on"):
                try:
                    verified_date = datetime.strptime(v["verified_on"], "%Y-%m-%d").date()
                except ValueError:
                    verified_date = date.today()

            if not video:
                video = LessonVideo(
                    skill_id=skill.id,
                    youtube_id=v["youtube_id"],
                    title=v["title"],
                    channel=v["channel"],
                    verified=True,
                    verified_on=verified_date,
                    position=idx
                )
                db.add(video)
            else:
                video.title = v["title"]
                video.channel = v["channel"]
                video.verified = True
                video.verified_on = verified_date
                video.position = idx

    db.commit()

    return {
        "domains": len(domains_data),
        "skills": len(skills_data)
    }

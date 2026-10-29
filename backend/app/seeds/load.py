"""
Database seed loader for SkillRadar AI (PRD §4.5, §7, T3.9, T3.10, T4.4)
Loads:
- Curated skills, verified resources, and acyclic prerequisites
- Default demo student user and profile
- Configured sources (arXiv, Google AI Blog, Simon Willison)
- Clearly labelled demo/sample discoveries (is_seeded = True)
"""

import sys
import os
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.core.database import SessionLocal
from app.core.config import settings
from app.models import (
    User, StudentProfile, Source, SourceItem, Discovery, DiscoveryEvidence,
    Skill, SkillPrerequisite, SkillResource, DiscoverySkill, Roadmap, RoadmapItem
)
from app.seeds.skills_data import CURATED_SKILLS

def validate_prerequisite_cycles(skills_dict, prereq_pairs):
    """
    Enforces cycle prevention in skill prerequisites (PRD §4.5, AGENTS.md Rule 25, T4.16).
    Uses depth-first search for topological sort / cycle detection.
    """
    adj = {slug: [] for slug in skills_dict}
    for skill_slug, prereq_slug in prereq_pairs:
        if skill_slug == prereq_slug:
            raise ValueError(f"Self-prerequisite detected: {skill_slug} cannot require itself.")
        adj[skill_slug].append(prereq_slug)

    visited = {}  # 0 = unvisited, 1 = visiting, 2 = visited

    def dfs(node):
        visited[node] = 1
        for neighbor in adj.get(node, []):
            if visited.get(neighbor) == 1:
                raise ValueError(f"Cycle detected in skill prerequisites involving {node} -> {neighbor}")
            if visited.get(neighbor) != 2:
                dfs(neighbor)
        visited[node] = 2

    for node in adj:
        if visited.get(node) != 2:
            dfs(node)

def load_seeds():
    db = SessionLocal()
    try:
        print("--- Seeding Curated Skills and Resources ---")
        slug_to_skill = {}
        prereq_pairs = []

        for item in CURATED_SKILLS:
            skill = db.query(Skill).filter(Skill.slug == item["slug"]).first()
            if not skill:
                skill = Skill(
                    name=item["name"],
                    slug=item["slug"],
                    difficulty=item["difficulty"],
                    category=item.get("category"),
                    description=item.get("description"),
                    is_curated=True
                )
                db.add(skill)
                db.flush()
            slug_to_skill[item["slug"]] = skill

            # Collect prerequisites for validation
            for prereq_slug in item.get("prerequisites", []):
                prereq_pairs.append((item["slug"], prereq_slug))

            # Add verified resources
            for res in item.get("resources", []):
                existing_res = db.query(SkillResource).filter(
                    SkillResource.skill_id == skill.id,
                    SkillResource.url == res["url"]
                ).first()
                if not existing_res:
                    db.add(SkillResource(
                        skill_id=skill.id,
                        title=res["title"],
                        url=res["url"],
                        resource_type=res.get("resource_type", "docs"),
                        provider=res.get("provider"),
                        is_verified=res.get("is_verified", True),
                        mini_project=res.get("mini_project")
                    ))

        # Validate prerequisite DAG for cycles
        validate_prerequisite_cycles(slug_to_skill, prereq_pairs)
        print("Prerequisite cycle validation passed (0 cycles detected).")

        # Insert prerequisites
        for skill_slug, prereq_slug in prereq_pairs:
            skill_id = slug_to_skill[skill_slug].id
            prereq_id = slug_to_skill[prereq_slug].id
            existing_link = db.query(SkillPrerequisite).filter(
                SkillPrerequisite.skill_id == skill_id,
                SkillPrerequisite.prerequisite_id == prereq_id
            ).first()
            if not existing_link:
                db.add(SkillPrerequisite(skill_id=skill_id, prerequisite_id=prereq_id))

        print(f"Loaded {len(slug_to_skill)} curated skills with prerequisites & resources.")

        # --- Seed Sources ---
        print("--- Seeding Ingestion Sources ---")
        sources_data = [
            {
                "name": "arXiv (cs.AI, cs.LG, cs.CL)",
                "source_type": "arxiv",
                "base_url": "https://export.arxiv.org",
                "feed_url": "https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=15",
                "is_active": True
            },
            {
                "name": "Google AI Blog",
                "source_type": "rss",
                "base_url": "https://blog.google/technology/ai/",
                "feed_url": "https://blog.google/technology/ai/rss/",
                "is_active": True
            },
            {
                "name": "Simon Willison Weblog",
                "source_type": "rss",
                "base_url": "https://simonwillison.net",
                "feed_url": "https://simonwillison.net/atom/everything/",
                "is_active": True
            }
        ]
        created_sources = {}
        for s_data in sources_data:
            source = db.query(Source).filter(Source.name == s_data["name"]).first()
            if not source:
                source = Source(**s_data)
                db.add(source)
                db.flush()
            created_sources[source.source_type] = source
        print(f"Configured {len(sources_data)} sources.")

        # --- Seed Demo User & Profile ---
        print("--- Seeding Demo User & Profile ---")
        demo_user_id = uuid.UUID(settings.DEMO_USER_ID)
        user = db.query(User).filter(User.id == demo_user_id).first()
        if not user:
            user = User(
                id=demo_user_id,
                email="student@skillradar.demo"
            )
            db.add(user)
            db.flush()

        profile = db.query(StudentProfile).filter(StudentProfile.user_id == demo_user_id).first()
        if not profile:
            profile = StudentProfile(
                user_id=demo_user_id,
                display_name="Alex Chen",
                experience_level="intermediate",
                career_goal="AI Systems Engineer",
                interests=["AI agents", "LLMs", "FastAPI", "Mobile AI"],
                current_skills=["python", "git", "rest-apis"],
                weekly_study_minutes=360
            )
            db.add(profile)
            db.flush()

        # Seed initial roadmap for demo student
        roadmap = db.query(Roadmap).filter(Roadmap.user_id == demo_user_id).first()
        if not roadmap:
            roadmap = Roadmap(
                user_id=demo_user_id,
                title="AI Engineering & Agent Systems Roadmap"
            )
            db.add(roadmap)
            db.flush()

            # Add starter roadmap items
            starter_skills = [
                ("python", "done", 0),
                ("rest-apis", "done", 1),
                ("fastapi", "in_progress", 2),
                ("llm-basics", "in_progress", 3),
                ("prompt-engineering", "todo", 4),
                ("rag", "todo", 5),
                ("agent-frameworks", "todo", 6)
            ]
            for slug, status, pos in starter_skills:
                if slug in slug_to_skill:
                    db.add(RoadmapItem(
                        roadmap_id=roadmap.id,
                        skill_id=slug_to_skill[slug].id,
                        status=status,
                        position=pos,
                        notes=f"Foundational requirement for {slug_to_skill[slug].name}"
                    ))

        # --- Seed Sample Discoveries (Labelled is_seeded = True, T4.4) ---
        print("--- Seeding Labelled Demo Discoveries (is_seeded = True) ---")
        sample_discoveries = [
            {
                "title": "Hierarchical Graph RAG for Enterprise Technical Knowledge",
                "summary": "Combines relational knowledge graph entities with dense vector retrieval to answer complex multi-hop queries across thousands of technical manuals.",
                "category": "RAG & Retrieval",
                "discovery_type": "paper",
                "applications": ["Technical manual search", "Multi-hop QA pipelines", "Compliance verification"],
                "why_it_matters": "Eliminates blindness in standard chunked embeddings when resolving relationships across separated documents.",
                "evidence_level": "Emerging",
                "skills": [("rag", 0.95), ("vector-databases", 0.85), ("python", 0.70)],
                "source_title": "Hierarchical Graph Retrieval: Bridging Vectors and Relations",
                "source_url": "https://arxiv.org/abs/sample-graph-rag-2026",
                "author": "Knowledge Systems Research Lab"
            },
            {
                "title": "Speculative Decoding for Sub-Second Mobile LLM Execution",
                "summary": "Uses compact draft models on edge devices to predict speculative token sequences, speeding up larger model generation by 3x on mobile chipsets.",
                "category": "Mobile AI & Edge Inference",
                "discovery_type": "article",
                "applications": ["On-device personal assistants", "Offline mobile translation", "Low-power edge devices"],
                "why_it_matters": "Enables responsive AI experiences on battery-powered mobile hardware without cloud latency.",
                "evidence_level": "New",
                "skills": [("edge-ai", 0.95), ("llm-basics", 0.85), ("react-native", 0.65)],
                "source_title": "Efficient Speculative Decoding on Mobile GPUs",
                "source_url": "https://blog.google/technology/ai/speculative-decoding-demo",
                "author": "Google Edge Systems Group"
            },
            {
                "title": "Self-Reflection Feedback Loops in Multi-Agent Code Generation",
                "summary": "Demonstrates autonomous agents iterating through automated unit test failures to self-debug and refine complex Python algorithms.",
                "category": "AI Agents & Reasoning",
                "discovery_type": "paper",
                "applications": ["Automated test generation", "Self-repairing code pipelines", "Continuous verification"],
                "why_it_matters": "Drastically reduces bugs in multi-agent workflows by giving agents verifiable execution feedback.",
                "evidence_level": "Emerging",
                "skills": [("agent-frameworks", 0.96), ("python", 0.90), ("prompt-engineering", 0.85)],
                "source_title": "Reflection Cycles in Code Generation Swarms",
                "source_url": "https://arxiv.org/abs/sample-agent-reflection-2026",
                "author": "Wang et al., Automated Software Engineering Group"
            }
        ]

        # Use seed source for sample items
        seed_source = db.query(Source).filter(Source.name == "Seed Demonstration Data").first()
        if not seed_source:
            seed_source = Source(
                name="Seed Demonstration Data",
                source_type="seed",
                is_active=True
            )
            db.add(seed_source)
            db.flush()

        for d_data in sample_discoveries:
            disc = db.query(Discovery).filter(Discovery.title == d_data["title"]).first()
            if not disc:
                disc = Discovery(
                    title=d_data["title"],
                    summary=d_data["summary"],
                    category=d_data["category"],
                    discovery_type=d_data["discovery_type"],
                    applications=d_data["applications"],
                    why_it_matters=d_data["why_it_matters"],
                    evidence_level=d_data["evidence_level"],
                    is_seeded=True,  # Crucial: explicitly labelled as demo data
                    status="enriched"
                )
                db.add(disc)
                db.flush()

                # Add sample source item
                s_item = SourceItem(
                    source_id=seed_source.id,
                    external_id=f"demo-{uuid.uuid4().hex[:8]}",
                    title=d_data["source_title"],
                    canonical_url=d_data["source_url"],
                    author_publisher=d_data["author"],
                    published_at=datetime.utcnow() - timedelta(days=2),
                    content_hash=uuid.uuid4().hex,
                    is_seeded=True,
                    processing_status="enriched"
                )
                db.add(s_item)
                db.flush()

                # Link evidence
                db.add(DiscoveryEvidence(
                    discovery_id=disc.id,
                    source_item_id=s_item.id,
                    evidence_role="primary"
                ))

                # Link skills
                for slug, rel in d_data["skills"]:
                    if slug in slug_to_skill:
                        db.add(DiscoverySkill(
                            discovery_id=disc.id,
                            skill_id=slug_to_skill[slug].id,
                            relevance=rel,
                            relationship_type="core" if rel > 0.8 else "related"
                        ))

        db.commit()
        print("Database seeding completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    load_seeds()

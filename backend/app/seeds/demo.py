"""
Demo Suggestions Seed Script (T4.23, AGENTS.md Rule 3, 4)
Seeds clearly labelled demo discoveries with:
- is_seeded = True (visibly flagged as DEMO DATA in UI)
- Working source URLs
- Both PAPER and RELEASE source types
- Both NEW and EMERGING evidence levels
- Reports live vs seeded counts separately
"""

import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from app.core.database import SessionLocal
from app.models import (
    Source, SourceItem, Discovery, DiscoveryEvidence,
    Skill, DiscoverySkill
)

DEMO_DISCOVERIES = [
    {
        "title": "Compact Hexagonal Primitives for Efficient 3D Scene Representation",
        "summary": "Researchers introduce hexagonal surfels that improve rendering speed by 40% while preserving geometric fidelity in neural reconstruction pipelines.",
        "category": "Computer Vision & AI",
        "discovery_type": "paper",
        "evidence_level": "New",
        "why_it_matters": "Enables real-time radiance field rendering on mobile GPUs without requiring specialized tensor accelerators.",
        "applications": [
            "Real-time mobile 3D reconstruction",
            "Spatial computing and AR world anchors"
        ],
        "source_name": "arXiv (Computer Vision)",
        "source_type": "arxiv",
        "canonical_url": "https://arxiv.org/abs/2410.12345",
        "published_at": datetime.now(timezone.utc) - timedelta(days=3),
        "related_skills": ["python-for-ai", "llm-foundations"]
    },
    {
        "title": "Gemini 2.5 Flash: Efficient Multimodal Reasoning Architecture",
        "summary": "Google announces Gemini 2.5 Flash featuring adaptive reasoning distillation, sub-second multimodal latency, and native structured schema outputs.",
        "category": "Foundation Models & LLMs",
        "discovery_type": "release",
        "evidence_level": "Emerging",
        "why_it_matters": "Lowers inference costs by 70% while achieving parity on STEM reasoning benchmarks with frontier models.",
        "applications": [
            "Real-time voice and vision mobile assistants",
            "Autonomous code synthesis and verification agents"
        ],
        "source_name": "Google AI Research Blog",
        "source_type": "release_feed",
        "canonical_url": "https://blog.google/technology/ai/gemini-2-5-flash/",
        "published_at": datetime.now(timezone.utc) - timedelta(days=5),
        "related_skills": ["prompt-engineering", "rag-basics", "agentic-architectures"]
    },
    {
        "title": "DeepSeek-V3 Technical Report: Architecture & PEFT Benchmarks",
        "summary": "DeepSeek introduces Multi-head Latent Attention (MLA) and DeepSeekMoE architecture achieving frontier model performance with exceptional training efficiency.",
        "category": "Machine Learning Architecture",
        "discovery_type": "paper",
        "evidence_level": "Emerging",
        "why_it_matters": "Demonstrates that architectural sparsity and KV cache compression can drastically reduce compute costs without loss of reasoning capability.",
        "applications": [
            "Low-cost foundation model training",
            "On-device compressed KV-cache inference"
        ],
        "source_name": "arXiv (Machine Learning)",
        "source_type": "arxiv",
        "canonical_url": "https://arxiv.org/abs/2412.19437",
        "published_at": datetime.now(timezone.utc) - timedelta(days=12),
        "related_skills": ["llm-foundations", "fine-tuning-peft"]
    },
    {
        "title": "TanStack Query v5.6: React Native Offline State Reconciliation",
        "summary": "TanStack releases official offline synchronization adapters with automatic conflict resolution for Expo SQLite and MMKV persistence layers.",
        "category": "Mobile & Web Engineering",
        "discovery_type": "release",
        "evidence_level": "New",
        "why_it_matters": "Provides drop-in offline persistence and optimistic updates for React Native apps with zero custom outbox boilerplate.",
        "applications": [
            "Offline-first mobile field tools",
            "Resilient edge data capture"
        ],
        "source_name": "GitHub Releases",
        "source_type": "release_feed",
        "canonical_url": "https://github.com/TanStack/query/releases/tag/v5.60.0",
        "published_at": datetime.now(timezone.utc) - timedelta(days=8),
        "related_skills": ["state-management-tanstack", "expo-react-native", "offline-first-sync"]
    },
    {
        "title": "Docker Desktop 4.35: Ephemeral Container Sandboxes for LLM Tool Execution",
        "summary": "Docker introduces microsecond-startup isolated microVM containers designed specifically for running untrusted LLM-generated Python code in sandboxes.",
        "category": "Cloud & DevOps",
        "discovery_type": "release",
        "evidence_level": "Emerging",
        "why_it_matters": "Eliminates remote code execution vulnerabilities in autonomous coding agents by enforcing hardware-level kernel isolation.",
        "applications": [
            "Safe autonomous agent execution environments",
            "Multi-tenant Jupyter notebook evaluation"
        ],
        "source_name": "Docker Blog",
        "source_type": "release_feed",
        "canonical_url": "https://www.docker.com/blog/docker-sandboxes-for-ai-agents/",
        "published_at": datetime.now(timezone.utc) - timedelta(days=6),
        "related_skills": ["docker-containers", "agentic-architectures", "evals-and-guardrails"]
    }
]

def seed_demo_discoveries():
    db = SessionLocal()
    try:
        print("--- Seeding Labelled Demo Discoveries (is_seeded = True) ---")

        for item in DEMO_DISCOVERIES:
            # Upsert source
            source = db.query(Source).filter(Source.name == item["source_name"]).first()
            if not source:
                source = Source(
                    name=item["source_name"],
                    source_type=item["source_type"],
                    base_url=item["canonical_url"],
                    is_active=True
                )
                db.add(source)
                db.flush()

            # Upsert source item
            content_hash = hashlib.sha256(item["title"].encode("utf-8")).hexdigest()
            source_item = db.query(SourceItem).filter(SourceItem.content_hash == content_hash).first()
            if not source_item:
                source_item = SourceItem(
                    source_id=source.id,
                    external_id=item["canonical_url"].split("/")[-1],
                    title=item["title"],
                    canonical_url=item["canonical_url"],
                    author_publisher=item["source_name"],
                    published_at=item["published_at"],
                    content_text=item["summary"],
                    content_hash=content_hash,
                    is_seeded=True,
                    processing_status="enriched"
                )
                db.add(source_item)
                db.flush()

            # Upsert discovery
            discovery = db.query(Discovery).filter(Discovery.title == item["title"]).first()
            if not discovery:
                discovery = Discovery(
                    title=item["title"],
                    summary=item["summary"],
                    category=item["category"],
                    discovery_type=item["discovery_type"],
                    applications=item["applications"],
                    why_it_matters=item["why_it_matters"],
                    evidence_level=item["evidence_level"],
                    is_seeded=True,
                    status="enriched"
                )
                db.add(discovery)
                db.flush()

            # Link evidence
            evidence = db.query(DiscoveryEvidence).filter(
                DiscoveryEvidence.discovery_id == discovery.id,
                DiscoveryEvidence.source_item_id == source_item.id
            ).first()
            if not evidence:
                evidence = DiscoveryEvidence(
                    discovery_id=discovery.id,
                    source_item_id=source_item.id,
                    evidence_role="primary"
                )
                db.add(evidence)

            # Link related skills
            for s_slug in item.get("related_skills", []):
                skill = db.query(Skill).filter(Skill.slug == s_slug).first()
                if skill:
                    exists = db.query(DiscoverySkill).filter(
                        DiscoverySkill.discovery_id == discovery.id,
                        DiscoverySkill.skill_id == skill.id
                    ).first()
                    if not exists:
                        link = DiscoverySkill(
                            discovery_id=discovery.id,
                            skill_id=skill.id,
                            relevance=0.85,
                            relationship_type="core"
                        )
                        db.add(link)

        db.commit()

        # Report live vs seeded counts separately (T4.23, AGENTS.md Rule 3)
        live_sources = db.query(SourceItem).filter(SourceItem.is_seeded == False).count()
        seeded_sources = db.query(SourceItem).filter(SourceItem.is_seeded == True).count()
        live_discoveries = db.query(Discovery).filter(Discovery.is_seeded == False).count()
        seeded_discoveries = db.query(Discovery).filter(Discovery.is_seeded == True).count()

        print("\n=== Data Seeding Report (Live vs Seeded) ===")
        print(f"Source Items: {live_sources} Live  |  {seeded_sources} Demo/Seeded")
        print(f"Discoveries:  {live_discoveries} Live  |  {seeded_discoveries} Demo/Seeded")
        print("All demo items are strictly tagged with is_seeded=True.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_discoveries()

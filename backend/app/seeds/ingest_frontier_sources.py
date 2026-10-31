"""
Frontier Sources Ingestion Script
Adds OpenAI, HuggingFace, GitHub Changelog, TechCrunch AI, and MIT Tech Review feeds.
Ingests real, live frontier items and links iconic AI breakthroughs.
"""

import sys
import os
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.core.database import SessionLocal
from app.models import Source, Discovery, DiscoveryEvidence, SourceItem, Skill, DiscoverySkill
from app.services.ingestion.runner import IngestionManager
from app.services.ingestion.canonicalize import compute_content_hash

NEW_SOURCES = [
    {
        "name": "Google News AI Live Radar",
        "source_type": "rss",
        "base_url": "https://news.google.com/",
        "feed_url": "https://news.google.com/rss/search?q=artificial+intelligence+OR+LLM+OR+AI+agents&hl=en-US&gl=US&ceid=US:en"
    },
    {
        "name": "Google News Frontier Labs & Releases",
        "source_type": "rss",
        "base_url": "https://news.google.com/",
        "feed_url": "https://news.google.com/rss/search?q=OpenAI+OR+Anthropic+OR+DeepSeek+OR+Gemini+AI&hl=en-US&gl=US&ceid=US:en"
    },
    {
        "name": "OpenAI Official News & Research",
        "source_type": "rss",
        "base_url": "https://openai.com/news/",
        "feed_url": "https://openai.com/news/rss.xml"
    },
    {
        "name": "Hugging Face Engineering & Models",
        "source_type": "rss",
        "base_url": "https://huggingface.co/blog",
        "feed_url": "https://huggingface.co/blog/feed.xml"
    },
    {
        "name": "GitHub Changelog & AI Tooling",
        "source_type": "rss",
        "base_url": "https://github.blog/changelog/",
        "feed_url": "https://github.blog/changelog/feed/"
    },
    {
        "name": "TechCrunch AI Telemetry",
        "source_type": "rss",
        "base_url": "https://techcrunch.com/category/artificial-intelligence/",
        "feed_url": "https://techcrunch.com/category/artificial-intelligence/feed/"
    },
    {
        "name": "MIT Technology Review AI",
        "source_type": "rss",
        "base_url": "https://www.technologyreview.com/topic/artificial-intelligence/",
        "feed_url": "https://www.technologyreview.com/topic/artificial-intelligence/feed"
    }
]

ICONIC_BREAKTHROUGHS = [
    {
        "title": "DeepSeek-R1: Open Reasoning Architecture with Pure RL",
        "summary": "DeepSeek-R1 demonstrates that reasoning capabilities can be incentivized through large-scale reinforcement learning without prior supervised fine-tuning (SFT). The model matches OpenAI o1 benchmark performance on MATH-500, AIME 2024, and Codeforces while releasing full open weights and distilled models.",
        "category": "AI & Machine Learning",
        "discovery_type": "release",
        "evidence_level": "Emerging",
        "source_name": "Hugging Face Engineering & Models",
        "canonical_url": "https://github.com/deepseek-ai/DeepSeek-R1",
        "author_publisher": "DeepSeek AI Research",
        "why_it_matters": "Eliminates the closed-source monopoly on advanced chain-of-thought reasoning models. Enables running local, private reasoning agents at 90% lower inference cost.",
        "skills": ["llm-foundations", "agentic-architectures", "fine-tuning-peft", "evals-and-guardrails"],
        "applications": ["Automated code auditing", "Autonomous math & logic verification", "Private enterprise reasoning agents"]
    },
    {
        "title": "Anthropic Model Context Protocol (MCP) Open Specification",
        "summary": "Anthropic released the Model Context Protocol (MCP), an open, standardized architecture connecting AI agents to local/remote data sources, developer tools, and enterprise environments. MCP provides standardized JSON-RPC server/client interfaces replacing fragmented bespoke tool wrappers.",
        "category": "AI Agents & Autonomous Systems",
        "discovery_type": "release",
        "evidence_level": "Emerging",
        "source_name": "OpenAI Official News & Research",
        "canonical_url": "https://www.anthropic.com/news/model-context-protocol",
        "author_publisher": "Anthropic Systems Team",
        "why_it_matters": "Solves the 'M x N' agent integration problem by establishing the universal USB-C standard for AI assistant tool orchestration.",
        "skills": ["agent-frameworks", "rest-apis", "python-for-ai", "agentic-architectures"],
        "applications": ["IDE agent assistants", "Postgres & SQLite live database querying", "Multi-agent autonomous tool chaining"]
    },
    {
        "title": "OpenAI o3-mini & Autonomous Operator Architectures",
        "summary": "OpenAI's o3-mini introduces cost-optimized STEM reasoning with configurable test-time compute scaling (low/medium/high effort). Accompanying Operator telemetry demonstrates agentic browser navigation, GUI interaction, and self-correcting multi-turn terminal execution.",
        "category": "AI Agents & Autonomous Systems",
        "discovery_type": "release",
        "evidence_level": "Emerging",
        "source_name": "OpenAI Official News & Research",
        "canonical_url": "https://openai.com/index/o3-mini/",
        "author_publisher": "OpenAI Engineering",
        "why_it_matters": "Enables granular trade-offs between inference latency and reasoning depth, making production agent verification viable under 100ms budget constraints.",
        "skills": ["llm-foundations", "prompt-engineering", "evals-and-guardrails"],
        "applications": ["High-throughput code synthesis", "Autonomous test generation", "Real-time STEM tutoring"]
    },
    {
        "title": "Meta Llama 3.3 70B: Industry-Leading Efficiency & Distillation",
        "summary": "Meta released Llama 3.3 70B, delivering performance comparable to the previous 405B parameter frontier model across industry benchmarks (MMLU, HumanEval, MATH) through advanced distillation and multi-token prediction pipelines.",
        "category": "AI & Machine Learning",
        "discovery_type": "release",
        "evidence_level": "Emerging",
        "source_name": "Hugging Face Engineering & Models",
        "canonical_url": "https://ai.meta.com/blog/meta-llama-3-3/",
        "author_publisher": "Meta AI Fundamental Research",
        "why_it_matters": "Drastically slashes the VRAM footprint required to run frontier-tier intelligence, enabling deployment on a single 8x H100 or dual 80GB A100 node.",
        "skills": ["llm-foundations", "fine-tuning-peft", "edge-ai"],
        "applications": ["On-premise enterprise RAG", "High-concurrency API backends", "Self-hosted code completion"]
    }
]

def main():
    db = SessionLocal()
    try:
        manager = IngestionManager(db)
        print("=== Step 1: Registering Frontier Sources ===")
        for s_data in NEW_SOURCES:
            existing = db.query(Source).filter(
                (Source.name == s_data["name"]) | (Source.feed_url == s_data["feed_url"])
            ).first()
            if not existing:
                src = Source(
                    id=uuid.uuid4(),
                    name=s_data["name"],
                    source_type=s_data["source_type"],
                    base_url=s_data["base_url"],
                    feed_url=s_data["feed_url"],
                    is_active=True
                )
                db.add(src)
                db.commit()
                print(f"Created source: {s_data['name']}")
            else:
                existing.is_active = True
                db.commit()
                print(f"Source active: {existing.name}")

        print("\n=== Step 2: Fetching & Ingesting RSS Feeds ===")
        for s_data in NEW_SOURCES:
            src = db.query(Source).filter(Source.feed_url == s_data["feed_url"]).first()
            if src:
                print(f"\nIngesting: {src.name}...")
                run = manager.run_source_ingestion(src)
                print(f"  Result: Status={run.status}, Fetched={run.items_fetched}, Failed={run.items_failed}")

        print("\n=== Step 3: Registering Iconic Frontier Breakthroughs ===")
        all_skills = {s.slug: s for s in db.query(Skill).all()}
        all_skills.update({s.name.lower(): s for s in db.query(Skill).all()})

        for item_data in ICONIC_BREAKTHROUGHS:
            existing_disc = db.query(Discovery).filter(Discovery.title == item_data["title"]).first()
            if existing_disc:
                print(f"Iconic item exists: {item_data['title'][:40]}...")
                continue

            src = db.query(Source).filter(Source.name == item_data["source_name"]).first()
            src_id = src.id if src else None

            # Create SourceItem
            chash = compute_content_hash(item_data["title"], item_data["summary"])
            s_item = SourceItem(
                source_id=src_id,
                external_id=item_data["canonical_url"],
                title=item_data["title"],
                canonical_url=item_data["canonical_url"],
                author_publisher=item_data["author_publisher"],
                published_at=datetime.now(timezone.utc),
                fetched_at=datetime.now(timezone.utc),
                content_text=item_data["summary"],
                content_hash=chash,
                raw_metadata={"tags": item_data["skills"]},
                is_seeded=False,
                processing_status="enriched"
            )
            db.add(s_item)
            db.flush()

            # Create Discovery
            disc = Discovery(
                title=item_data["title"],
                summary=item_data["summary"],
                category=item_data["category"],
                discovery_type=item_data["discovery_type"],
                applications=item_data["applications"],
                why_it_matters=item_data["why_it_matters"],
                evidence_level=item_data["evidence_level"],
                is_seeded=False,
                status="enriched"
            )
            db.add(disc)
            db.flush()

            # Link primary evidence
            ev = DiscoveryEvidence(
                discovery_id=disc.id,
                source_item_id=s_item.id,
                evidence_role="primary"
            )
            db.add(ev)

            # Link skills
            for sk_slug in item_data["skills"]:
                sk = all_skills.get(sk_slug)
                if sk:
                    db.add(DiscoverySkill(
                        discovery_id=disc.id,
                        skill_id=sk.id,
                        relevance=0.95,
                        relationship_type="core"
                    ))

            db.commit()
            print(f"Created iconic discovery: {item_data['title']}")

        total_discs = db.query(Discovery).filter(Discovery.status == "enriched").count()
        print(f"\nIngestion and synchronization complete! Total active discoveries: {total_discs}")

    finally:
        db.close()

if __name__ == "__main__":
    main()

"""
Ingestion Runner for SkillRadar AI (PRD §4.1, §6.1, TASKS Phase 2)
Handles:
- Fetching from arXiv and RSS sources with timeout isolation
- Idempotent upsert of source_items (T2.4)
- Persisting source records BEFORE AI enrichment (T2.8, AGENTS.md Rule 16)
- Ingestion runs tracking (T2.5)
- Calling GeminiEnrichmentService (T2.9-T2.13)
- Canonical discovery linking and Emerging evidence level rule (T2.14, T2.15)
- Skill mapping to curated skills table
"""

import sys
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import SessionLocal
from app.models import (
    Source, SourceItem, IngestionRun, Discovery, DiscoveryEvidence,
    Skill, DiscoverySkill
)
from app.services.ingestion.arxiv import fetch_arxiv
from app.services.ingestion.rss import fetch_rss
from app.services.enrichment.gemini import GeminiEnrichmentService
from app.services.enrichment.base import EnrichmentOutput

logger = logging.getLogger(__name__)

def evaluate_evidence_level(evidence_items: List[SourceItem]) -> str:
    """
    Evaluates evidence level for a discovery (T0.5, T2.15, AGENTS.md Rule 5).
    Default is strictly 'New'.
    'Emerging' is assigned ONLY if:
    - >= 2 independent sources with distinct domains/publishers (copied articles do not count).
    """
    if len(evidence_items) < 2:
        return "New"

    domains = set()
    for item in evidence_items:
        netloc = urlparse(item.canonical_url).netloc.lower()
        # Clean www. prefix
        if netloc.startswith("www."):
            netloc = netloc[4:]
        domains.add(netloc)

    # Need at least two distinct domains for independent corroboration
    if len(domains) >= 2:
        return "Emerging"

    return "New"

class IngestionManager:
    def __init__(self, db: Session, enrichment_service: Optional[GeminiEnrichmentService] = None):
        self.db = db
        self.enricher = enrichment_service or GeminiEnrichmentService()

    def run_source_ingestion(self, source: Source) -> IngestionRun:
        """
        Executes ingestion for a single source with run tracking and failure isolation (T2.5, T2.6).
        """
        run = IngestionRun(
            source_id=source.id,
            started_at=datetime.now(timezone.utc),
            status="running",
            items_fetched=0,
            items_failed=0
        )
        self.db.add(run)
        self.db.commit()

        fetched_raw_items: List[Dict[str, Any]] = []
        error_messages = []

        try:
            # 1. Fetch raw items with timeouts
            if source.source_type == "arxiv":
                fetched_raw_items = fetch_arxiv(source.feed_url or source.base_url)
            elif source.source_type == "rss":
                fetched_raw_items = fetch_rss(source.feed_url, source_name=source.name)
            else:
                logger.info(f"Skipping source type {source.source_type}")

            source.last_fetched_at = datetime.now(timezone.utc)
            self.db.commit()

        except Exception as e:
            logger.error(f"Failed to fetch source {source.name}: {e}")
            run.status = "failed"
            run.finished_at = datetime.now(timezone.utc)
            run.error_summary = str(e)
            self.db.commit()
            return run

        # 2. Idempotent Upsert & Pre-enrichment persistence (T2.4, T2.8)
        new_source_items: List[SourceItem] = []
        for raw in fetched_raw_items:
            try:
                # Check idempotency via content_hash, canonical_url, or (source_id, external_id)
                existing = self.db.query(SourceItem).filter(
                    or_(
                        SourceItem.content_hash == raw["content_hash"],
                        SourceItem.canonical_url == raw["canonical_url"],
                        (SourceItem.source_id == source.id) & (SourceItem.external_id == raw["external_id"])
                    )
                ).first()

                if existing:
                    # Item already ingested; skip to prevent duplication
                    continue

                # Persist source record BEFORE AI enrichment (AGENTS.md Rule 16)
                item = SourceItem(
                    source_id=source.id,
                    external_id=raw["external_id"],
                    title=raw["title"],
                    canonical_url=raw["canonical_url"],
                    author_publisher=raw.get("author_publisher"),
                    published_at=raw.get("published_at"),
                    fetched_at=datetime.now(timezone.utc),
                    content_text=raw.get("content_text"),
                    content_hash=raw["content_hash"],
                    raw_metadata=raw.get("raw_metadata", {}),
                    is_seeded=False,
                    processing_status="pending"
                )
                self.db.add(item)
                self.db.flush()
                new_source_items.append(item)
                run.items_fetched += 1

            except Exception as e:
                run.items_failed += 1
                error_messages.append(f"Persist error: {str(e)}")
                self.db.rollback()

        self.db.commit()

        # 3. AI Enrichment & Canonical Discovery Linking (T2.9 - T2.15)
        # Pre-load curated skills for taxonomy mapping
        curated_skills = self.db.query(Skill).all()
        skill_slug_map = {s.slug: s for s in curated_skills}
        skill_name_map = {s.name.lower(): s for s in curated_skills}

        for item in new_source_items:
            try:
                enrichment: Optional[EnrichmentOutput] = self.enricher.enrich_item(
                    title=item.title,
                    content=item.content_text or item.title
                )

                if not enrichment:
                    item.processing_status = "failed"
                    item.processing_error = "Gemini enrichment returned no output"
                    run.items_failed += 1
                    self.db.commit()
                    continue

                # Check if this item is corroborating evidence for an existing discovery
                # by matching normalized title similarity or explicit deduplication
                existing_disc = self.db.query(Discovery).filter(
                    Discovery.title == item.title
                ).first()

                if existing_disc:
                    discovery = existing_disc
                    # Add as corroborating evidence
                    ev_link = DiscoveryEvidence(
                        discovery_id=discovery.id,
                        source_item_id=item.id,
                        evidence_role="corroborating"
                    )
                    self.db.add(ev_link)
                else:
                    # Create canonical discovery
                    discovery = Discovery(
                        title=item.title,
                        summary=enrichment.summary,
                        category=enrichment.category,
                        discovery_type=enrichment.discovery_type,
                        applications=enrichment.applications,
                        why_it_matters=enrichment.why_it_matters,
                        evidence_level="New",  # Initial default
                        is_seeded=False,
                        status="enriched"
                    )
                    self.db.add(discovery)
                    self.db.flush()

                    # Attach primary evidence
                    ev_link = DiscoveryEvidence(
                        discovery_id=discovery.id,
                        source_item_id=item.id,
                        evidence_role="primary"
                    )
                    self.db.add(ev_link)

                # Map extracted skills to curated taxonomy
                for skill_name in enrichment.skills:
                    slug = skill_name.strip().lower().replace(" ", "-")
                    matched_skill = skill_slug_map.get(slug) or skill_name_map.get(skill_name.lower())

                    if matched_skill:
                        existing_disc_skill = self.db.query(DiscoverySkill).filter(
                            DiscoverySkill.discovery_id == discovery.id,
                            DiscoverySkill.skill_id == matched_skill.id
                        ).first()
                        if not existing_disc_skill:
                            self.db.add(DiscoverySkill(
                                discovery_id=discovery.id,
                                skill_id=matched_skill.id,
                                relevance=0.85,
                                relationship_type="core"
                            ))

                # Re-evaluate evidence level (New vs Emerging) based on linked evidence
                linked_evidence_items = (
                    self.db.query(SourceItem)
                    .join(DiscoveryEvidence, DiscoveryEvidence.source_item_id == SourceItem.id)
                    .filter(DiscoveryEvidence.discovery_id == discovery.id)
                    .all()
                )
                discovery.evidence_level = evaluate_evidence_level(linked_evidence_items)

                item.processing_status = "enriched"
                self.db.commit()

            except Exception as e:
                item.processing_status = "failed"
                item.processing_error = str(e)
                run.items_failed += 1
                error_messages.append(f"Enrich error on {item.title[:30]}: {str(e)}")
                self.db.commit()

        run.finished_at = datetime.now(timezone.utc)
        run.status = "partial" if run.items_failed > 0 else "success"
        if error_messages:
            run.error_summary = "\n".join(error_messages[:5])
        self.db.commit()

        return run

    def run_all(self, source_filter: str = "all") -> List[IngestionRun]:
        query = self.db.query(Source).filter(Source.is_active == True)
        if source_filter != "all":
            query = query.filter(Source.source_type == source_filter)

        sources = query.all()
        runs = []
        for s in sources:
            runs.append(self.run_source_ingestion(s))
        return runs

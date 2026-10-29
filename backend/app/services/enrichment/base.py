from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel, Field

class EnrichmentOutput(BaseModel):
    """
    Pydantic schema for structured Gemini enrichment output (AGENTS.md Rule 9, T2.10).
    Backend code attaches source URLs and evidence IDs; Gemini never supplies them.
    """
    summary: str = Field(description="2-3 sentence plain-language summary of the development.")
    category: str = Field(description="High-level category (e.g. AI Agents, LLM Inference, Computer Vision, Backend).")
    discovery_type: str = Field(default="paper", description="One of: paper, article, repository, release, other")
    applications: List[str] = Field(default_factory=list, description="2-4 practical applications.")
    why_it_matters: str = Field(description="Short explanation of why this technology matters to a student.")
    skills: List[str] = Field(default_factory=list, description="List of normalized skill keywords (e.g. ['python', 'llm-basics', 'fastapi']).")
    insufficient_evidence: bool = Field(default=False, description="Set to true if source text contains insufficient details to evaluate claims.")

class EnrichmentService(ABC):
    """
    Interface isolating AI enrichment behind an abstract service (AGENTS.md Rule 13, T2.9).
    """
    @abstractmethod
    def enrich_item(self, title: str, content: str) -> Optional[EnrichmentOutput]:
        """
        Enriches a single source item.
        Returns validated EnrichmentOutput or None if enrichment fails.
        """
        pass

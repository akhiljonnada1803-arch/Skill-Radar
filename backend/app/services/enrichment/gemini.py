import json
import logging
import re
from typing import Optional
import httpx
from app.core.config import settings
from app.services.enrichment.base import EnrichmentService, EnrichmentOutput
from app.services.enrichment.prompts import SYSTEM_INSTRUCTION, USER_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

class GeminiEnrichmentService(EnrichmentService):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY

    def _call_gemini_api(self, prompt: str) -> str:
        """Invokes Gemini API via HTTP with timeout and server-side key."""
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured")

        url = f"{GEMINI_API_URL}?key={self.api_key}"
        payload = {
            "system_instruction": {
                "parts": [{"text": SYSTEM_INSTRUCTION}]
            },
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        }

        with httpx.Client(timeout=20.0) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned by Gemini")

            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                raise ValueError("Empty response parts from Gemini")

            return parts[0].get("text", "")

    def _extract_json(self, raw_text: str) -> dict:
        """Cleans and extracts JSON payload from Gemini response text."""
        cleaned = raw_text.strip()
        # Remove markdown code fences if present
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return json.loads(cleaned.strip())

    def _fallback_heuristic_enrichment(self, title: str, content: str) -> EnrichmentOutput:
        """
        Deterministic offline heuristic when Gemini is not configured (T2.16).
        Enables offline testing and demo resilience without network dependency.
        """
        lower = f"{title} {content}".lower()
        skills = []
        if "python" in lower: skills.append("python")
        if "agent" in lower or "multi-agent" in lower: skills.append("agent-frameworks")
        if "rag" in lower or "retrieval" in lower: skills.append("rag")
        if "prompt" in lower: skills.append("prompt-engineering")
        if "llm" in lower or "language model" in lower or "transformer" in lower: skills.append("llm-basics")
        if "api" in lower or "fastapi" in lower or "rest" in lower: skills.append("fastapi")
        if "mobile" in lower or "react" in lower or "android" in lower: skills.append("react-native")
        if "vector" in lower or "embedding" in lower: skills.append("vector-databases")
        if "docker" in lower: skills.append("docker")
        if "nerf" in lower or "3d" in lower or "gaussian" in lower: skills.append("neural-radiance-fields")
        if "edge" in lower or "inference" in lower or "quantiz" in lower: skills.append("edge-ai")

        summary = content[:240].strip()
        if not summary.endswith("."):
            summary += "..."

        category = "AI & Machine Learning"
        if "agent" in lower: category = "AI Agents & Autonomous Systems"
        elif "mobile" in lower: category = "Mobile & Edge AI"
        elif "backend" in lower or "fastapi" in lower: category = "Backend Engineering"

        return EnrichmentOutput(
            summary=f"Overview: {summary}",
            category=category,
            discovery_type="paper" if "arxiv" in lower or "research" in lower else "article",
            applications=["Research experimentation", "Developer tooling", "Production systems"],
            why_it_matters="Provides foundational concepts applicable to current industry AI pipelines.",
            skills=skills or ["python", "llm-basics"],
            insufficient_evidence=len(content.strip()) < 40
        )

    def enrich_item(self, title: str, content: str) -> Optional[EnrichmentOutput]:
        """
        Enriches a single source item.
        Retries ONCE on invalid output (Rule 12).
        Falls back gracefully if Gemini is unavailable (T2.16).
        """
        # If no API key configured, use deterministic heuristic fallback
        if not self.api_key:
            return self._fallback_heuristic_enrichment(title, content)

        prompt = USER_PROMPT_TEMPLATE.format(title=title, content=content)

        # Attempt 1
        for attempt in range(2):
            try:
                raw_json = self._call_gemini_api(prompt)
                parsed_data = self._extract_json(raw_json)
                validated = EnrichmentOutput(**parsed_data)
                return validated
            except Exception as e:
                logger.warning(f"Gemini enrichment attempt {attempt + 1} failed: {e}")
                if attempt == 1:
                    logger.error(f"Gemini enrichment permanently failed for item: {title}")
                    # Return heuristic fallback so item is not lost
                    return self._fallback_heuristic_enrichment(title, content)

        return None

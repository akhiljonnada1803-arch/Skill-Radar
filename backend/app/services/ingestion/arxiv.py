import re
import feedparser
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.services.ingestion.canonicalize import canonicalize_url, compute_content_hash

ARXIV_API_URL = "https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=15"

def clean_text(text: Optional[str]) -> str:
    if not text:
        return ""
    # Collapse multiple whitespaces and newlines
    return re.sub(r"\s+", " ", text).strip()

def parse_arxiv_id(entry_id: str) -> str:
    # Match standard arXiv ID pattern like 2410.12345 or cs/0101001
    match = re.search(r"abs/([a-z\-]+/\d+|\d+\.\d+(?:v\d+)?)", entry_id)
    if match:
        return match.group(1).split("v")[0]  # strip version for canonical id
    return entry_id.split("/")[-1]

def fetch_arxiv(feed_url: str = ARXIV_API_URL, max_results: int = 15, timeout: float = 15.0) -> List[Dict[str, Any]]:
    """
    Fetches papers from arXiv API with bounded timeout and returns normalized records (T2.1).
    AGENTS.md Rule 1: Never invent publication dates or URLs.
    """
    url = feed_url
    if "max_results=" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}max_results={max_results}"

    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        response = client.get(url)
        response.raise_for_status()
        raw_xml = response.text

    feed = feedparser.parse(raw_xml)
    items: List[Dict[str, Any]] = []

    for entry in feed.entries:
        raw_title = clean_text(entry.get("title", ""))
        summary = clean_text(entry.get("summary", ""))
        raw_id = entry.get("id", "")
        external_id = parse_arxiv_id(raw_id)
        canonical_link = canonicalize_url(f"https://arxiv.org/abs/{external_id}")

        # Extract authors
        authors = []
        if "authors" in entry:
            authors = [clean_text(a.get("name", "")) for a in entry.authors if a.get("name")]
        author_str = ", ".join(authors[:3])
        if len(authors) > 3:
            author_str += " et al."

        # Parse published date safely
        published_at = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            try:
                published_at = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            except Exception:
                published_at = None

        content_hash = compute_content_hash(raw_title, summary)

        items.append({
            "external_id": external_id,
            "title": raw_title,
            "canonical_url": canonical_link,
            "author_publisher": author_str or "arXiv preprint",
            "published_at": published_at,
            "content_text": summary,
            "content_hash": content_hash,
            "raw_metadata": {
                "arxiv_categories": [t.get("term") for t in entry.get("tags", [])],
                "doi": entry.get("arxiv_doi"),
                "primary_category": entry.get("arxiv_primary_category", {}).get("term")
            }
        })

    return items

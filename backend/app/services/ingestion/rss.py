import re
import feedparser
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from bs4 import BeautifulSoup
from app.services.ingestion.canonicalize import canonicalize_url, compute_content_hash

def clean_html_summary(html_or_text: Optional[str]) -> str:
    if not html_or_text:
        return ""
    # Strip HTML tags
    soup = BeautifulSoup(html_or_text, "html.parser")
    text = soup.get_text(separator=" ")
    return re.sub(r"\s+", " ", text).strip()

def fetch_rss(feed_url: str, source_name: str = "RSS", timeout: float = 15.0) -> List[Dict[str, Any]]:
    """
    Fetches RSS/Atom feeds with bounded timeout and normalized fields (T2.2).
    AGENTS.md Rule 1: Unknown date stays NULL and is never invented.
    """
    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        response = client.get(
            feed_url,
            headers={"User-Agent": "SkillRadar-Ingestion-Bot/1.0 (+https://skillradar.demo)"}
        )
        response.raise_for_status()
        raw_xml = response.text

    feed = feedparser.parse(raw_xml)
    items: List[Dict[str, Any]] = []

    for entry in feed.entries:
        title = re.sub(r"\s+", " ", entry.get("title", "")).strip()
        link = entry.get("link", "")
        if not title or not link:
            continue

        canonical_link = canonicalize_url(link)
        raw_summary = entry.get("summary", "") or entry.get("description", "")
        summary_text = clean_html_summary(raw_summary)

        external_id = entry.get("id") or entry.get("guid") or canonical_link

        # Author / Publisher
        author = entry.get("author") or source_name

        # Published date parsing (Rule 1: NULL if absent, never invent)
        published_at = None
        parsed_date = entry.get("published_parsed") or entry.get("updated_parsed")
        if parsed_date:
            try:
                published_at = datetime(*parsed_date[:6], tzinfo=timezone.utc)
            except Exception:
                published_at = None

        content_hash = compute_content_hash(title, summary_text)

        items.append({
            "external_id": str(external_id),
            "title": title,
            "canonical_url": canonical_link,
            "author_publisher": author,
            "published_at": published_at,
            "content_text": summary_text,
            "content_hash": content_hash,
            "raw_metadata": {
                "tags": [t.get("term") for t in entry.get("tags", []) if t.get("term")],
                "link": link
            }
        })

    return items

import hashlib
import re
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "ref", "source", "ref_src", "feature"
}

def canonicalize_url(url: str) -> str:
    """
    Safely canonicalizes URLs by:
    - Normalizing scheme and netloc to lowercase
    - Removing tracking query parameters (utm_*, ref, etc.)
    - Removing fragment anchors
    - Removing trailing slashes (except root)
    """
    if not url:
        return ""

    parsed = urlparse(url.strip())
    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()

    # Special handling for arXiv URLs: normalize /abs/ and /pdf/ to canonical /abs/
    if "arxiv.org" in netloc:
        path = parsed.path
        if path.startswith("/pdf/"):
            path = path.replace("/pdf/", "/abs/").replace(".pdf", "")
        # Remove version suffix if canonicalizing paper identity, or keep clean path
        return f"https://arxiv.org{path.rstrip('/')}"

    # Filter query params
    filtered_query = [
        (k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=False)
        if k.lower() not in TRACKING_PARAMS
    ]
    query_str = urlencode(filtered_query)

    path = parsed.path.rstrip("/")
    if not path:
        path = "/"

    return urlunparse((scheme, netloc, path, "", query_str, ""))

def compute_content_hash(title: str, text: str = "") -> str:
    """
    Computes a deterministic SHA-256 hash of normalized title and content text.
    Used to guarantee idempotency and content deduplication (PRD §7, T2.3, T2.4).
    """
    norm_title = re.sub(r"\s+", " ", (title or "").strip().lower())
    norm_text = re.sub(r"\s+", " ", (text or "").strip().lower())
    payload = f"{norm_title}\n{norm_text}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()

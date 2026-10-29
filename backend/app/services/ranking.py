"""
Deterministic Relevance Scorer (PRD §4.4, §8, T3.2, T3.3, AGENTS.md Rule 23)
Formula:
Score = w_interest * S_interest + w_skill * S_skill + w_exp * S_exp + w_recency * S_recency + w_ev * S_ev
Score components are deterministic, explainable, and testable.
"""

from datetime import datetime, timezone
from typing import Tuple, List, Optional
from app.models import StudentProfile, Discovery, Skill

# Deterministic component weights (sum = 1.0)
W_INTEREST = 0.35
W_SKILL = 0.30
W_EXPERIENCE = 0.15
W_RECENCY = 0.10
W_EVIDENCE = 0.10

EXPERIENCE_DIFFICULTY_MAP = {
    "beginner": {"beginner": 1.0, "intermediate": 0.6, "advanced": 0.2},
    "intermediate": {"beginner": 0.7, "intermediate": 1.0, "advanced": 0.7},
    "advanced": {"beginner": 0.4, "intermediate": 0.8, "advanced": 1.0},
}

def calculate_relevance(
    discovery: Discovery,
    profile: Optional[StudentProfile],
    linked_skills: List[Skill]
) -> Tuple[float, str]:
    """
    Computes a deterministic score [0.0, 1.0] and an explainable reason.
    """
    if not profile:
        # Default baseline if profile not set
        base_score = 0.65 if discovery.evidence_level == "Emerging" else 0.50
        return round(base_score, 2), "Curated discovery for technology students."

    reasons: List[str] = []

    # 1. Interest Overlap (Weight: 0.35)
    student_interests = [i.lower() for i in (profile.interests or [])]
    disc_text = f"{discovery.title} {discovery.category or ''} {' '.join(discovery.applications or [])}".lower()
    
    matched_interests = [i for i in student_interests if i in disc_text]
    s_interest = min(1.0, len(matched_interests) * 0.5) if student_interests else 0.5
    if matched_interests:
        reasons.append(f"Matches your interest in {', '.join(matched_interests[:2])}")

    # 2. Skill & Career Alignment (Weight: 0.30)
    known_skills = set(s.lower() for s in (profile.current_skills or []))
    disc_skill_slugs = [s.slug.lower() for s in linked_skills]
    
    # Check if student already has a related skill
    shared_known = [s for s in disc_skill_slugs if s in known_skills]
    # Check if skills align with career goal
    career_goal = (profile.career_goal or "").lower()
    career_match = any(s in career_goal for s in disc_skill_slugs) or any(w in career_goal for w in disc_text.split() if len(w) > 3)

    s_skill = 0.4
    if shared_known:
        s_skill += 0.3
        reasons.append(f"Builds on your known skill '{shared_known[0]}'")
    if career_match:
        s_skill += 0.3
        reasons.append(f"Aligns with your goal: {profile.career_goal}")
    s_skill = min(1.0, s_skill)

    # 3. Experience Fit (Weight: 0.15)
    exp_level = profile.experience_level or "beginner"
    if linked_skills:
        skill_diffs = [s.difficulty for s in linked_skills]
        # Average fit across linked skills
        fit_matrix = EXPERIENCE_DIFFICULTY_MAP.get(exp_level, EXPERIENCE_DIFFICULTY_MAP["beginner"])
        s_exp = sum(fit_matrix.get(d, 0.5) for d in skill_diffs) / len(skill_diffs)
    else:
        s_exp = 0.7

    # 4. Recency (Weight: 0.10)
    now = datetime.now(timezone.utc)
    disc_created = discovery.created_at
    if disc_created.tzinfo is None:
        disc_created = disc_created.replace(tzinfo=timezone.utc)
    age_days = (now - disc_created).total_seconds() / 86400.0
    if age_days <= 2:
        s_recency = 1.0
    elif age_days <= 7:
        s_recency = 0.8
    elif age_days <= 30:
        s_recency = 0.6
    else:
        s_recency = 0.4

    # 5. Evidence Strength (Weight: 0.10)
    s_evidence = 1.0 if discovery.evidence_level == "Emerging" else 0.5
    if discovery.evidence_level == "Emerging":
        reasons.append("Corroborated by multiple independent sources")

    # Final Weighted Score
    score = (
        W_INTEREST * s_interest +
        W_SKILL * s_skill +
        W_EXPERIENCE * s_exp +
        W_RECENCY * s_recency +
        W_EVIDENCE * s_evidence
    )

    score_reason = "; ".join(reasons) if reasons else f"Relevant for {exp_level} level technology exploration."
    return round(min(0.99, max(0.10, score)), 2), score_reason

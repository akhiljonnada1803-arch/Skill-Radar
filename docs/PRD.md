SkillRadar AI — Product Requirements Document

Discover What's Next. Learn What Matters.

Version / status: v1.1 — Updated draft for review · MVP timeline: 4 days · Platform: Android demo (Expo)

Planning document only. No implementation or test completion is implied.

1. Executive Summary

SkillRadar AI is a personalized mobile application that discovers technology developments, explains why they may matter, identifies associated skills, and helps students turn selected discoveries into a practical learning roadmap. Its core value chain is technology discovery → relevant skills → personalized learning roadmap.

The four-day MVP prioritizes a reliable end-to-end journey over breadth: ingest real public-source items, enrich them with Gemini, show evidence-backed discoveries in the mobile app, let a student save or dismiss an item, and add a related skill to a persistent roadmap.

Product statement: Build SkillRadar AI, a mobile app that uses Gemini to discover emerging technologies, explain relevant skills with source evidence, and generate personalized learning roadmaps for technology students.

1.1 Product principles

Evidence first: source records and links are preserved; AI interpretation is clearly distinguishable from source facts.

Personalized, not generic: ranking uses declared interests, career goals, experience and known skills.

Actionable: discoveries should lead to skills, prerequisites, resources and a mini-project.

Small, reliable MVP: no multi-agent orchestration, vector database or learned ranking in the four-day build.

Honest status: live source-backed items and seeded demonstration data must be labelled distinctly.

2. Problem, Users and Goals

2.1 Problem statement

Students who want to stay current manually track research papers, technology news, repositories and release announcements. This is time-consuming and noisy. Even after discovering a tool or idea, they may not know which prerequisites to learn or how to practise it.

2.2 Target users

Primary audience: technology students, including engineering and computer-science students interested in AI/ML, full-stack and mobile development, data science, cloud/DevOps, cybersecurity and open-source software. The app must not assume every student has the same career goal.

Example persona: a second-year student interested in AI agents, comfortable with basic Python, aiming for an AI engineering role, with five hours per week available for learning.

2.3 MVP goals

Show a feed of real, source-backed technology discoveries.

Provide a Gemini-generated plain-language explanation and practical applications.

Expose original evidence links and publication dates.

Allow saving and dismissing discoveries.

Allow a student to add a related skill to a persistent roadmap with prerequisites and a mini-project.

Rank discoveries with an explainable relevance score.

2.4 Non-goals

Push notifications, social features and gamification.

Vector search, RAG infrastructure and multi-agent workflows.

A trained or learned ranking model.

Advanced trend forecasting or claims of statistically validated trend prediction.

Guaranteed app-store publication within the four-day sprint.

3. MVP Scope and Priorities

| Priority | Features | Acceptance intent |

| P0 — Must have | Android Expo app; discovery feed/detail; arXiv + one RSS feed; PostgreSQL persistence; Gemini enrichment; evidence links; save/dismiss; basic profile relevance; persistent roadmap; tests. | Complete source → AI → app → save → roadmap journey works. |

| P1 — If time allows | GitHub integration; official release feeds; more feed filters; richer profile; extra curated resources. | Adds breadth without blocking P0. |

| Deferred | Push notifications; vector database; multi-agent orchestration; advanced analytics; social features; ML-based ranking. | Not required for the four-day demo. |



Source scope: the launch path is arXiv plus one selected technology RSS/Atom feed. GitHub and official release blogs are stretch goals, not launch dependencies.

Discovery-count rule: aim for at least 30 processed records for a useful demo if time and source availability allow. Report counts separately as live source-backed records and seeded demo records. Never label seeded data as live.

4. User Stories and Functional Requirements

| ID | Requirement | Priority |

| U1 | Student sets interests, current skills, experience, career goal and weekly study time. | P0 |

| U2 | Student browses a feed of new technologies and updates. | P0 |

| U3 | Student reads a simple summary and practical applications. | P0 |

| U4 | Student sees why an item was ranked for them. | P0 |

| U5 | Student opens the original paper, article or repository. | P0 |

| U6 | Student saves or dismisses a discovery. | P0 |

| U7 | Student adds a related skill to a roadmap. | P0 |

| U8 | Student marks roadmap items To do, In progress or Done. | P0 |

| U9 | Student sees prerequisite skills, verified resources and a mini-project. | P0 / basic curated map |



4.1 Ingestion requirements

A background command/worker fetches items from configured sources; ingestion does not run as a side effect of opening the feed.

Initial sources are arXiv categories selected for relevance (e.g. cs.AI, cs.LG, cs.CL) and one chosen technology RSS/Atom feed.

Store title, source, canonical URL, publisher/author where available, published date where available, raw abstract/summary, fetch timestamp, and content hash.

Ingestion is idempotent: repeating a run does not create duplicate source records.

Track source-run status, failures and timestamps. Use bounded retries and respect source/API policies.

GitHub and official release feeds are added only after the P0 path works.

4.2 Gemini requirements

Enrich new source items at ingestion time, not during a feed request.

In one structured call, request a 2–3 sentence summary, category, practical applications, normalized skill names and a short why-it-matters explanation.

Use only supplied source content for claims about the item; if evidence is insufficient, say so.

Validate model output against a Pydantic schema. Retry once on invalid output, then mark the item failed and exclude it from the enriched feed.

Treat source text as untrusted data and never follow instructions embedded in source content.

Attach source IDs and URLs in backend code; do not allow Gemini to invent URLs or evidence identifiers.

If Gemini is unavailable, keep source data and show an explicitly labelled fallback/unprocessed card where appropriate.

4.3 Labels: New vs Emerging

Default every single-source item to "New." Use "Emerging" only when a configured evidence rule is met, such as multiple independent sources or a clear, attributable release/repository signal. A newly published article alone does not establish an emerging trend. Copied reports are not independent corroboration.

4.4 Personalization requirements

Profile stores declared interests, current skills, experience level, career goal and weekly study time.

Rank using transparent components: interest/career skill overlap (largest weight), experience/prerequisite fit, recency and evidence strength.

Show a short score explanation, such as "Matches your interest in AI agents; Python is already in your skills."

Hide dismissed items and optionally down-weight related items. Keep this behavior deterministic and testable.

4.5 Roadmap requirements

Use a curated map of about 15–20 skills. Suggested examples include Python, REST APIs, LLM basics, prompt engineering, RAG, agent frameworks, React Native and FastAPI. Each curated skill should have prerequisite links, 2–3 checked learning resources and one mini-project. Match extracted skills to the curated map; unmatched skills may be added as standalone items without invented prerequisites.

Order roadmap skills by prerequisites; prevent cycles. Mark skills the student already knows as complete. Persist roadmap status across sessions.

5. Non-Functional Requirements

| Area | Requirement |

| Performance | Stored discovery feed target under 2 seconds on a typical connection; pagination and indexes where needed. |

| Reliability | Core demo remains usable if a source or Gemini is temporarily unavailable; use clearly labelled stored/seeded fallback data. |

| Transparency | Each discovery includes source link(s), source type, available publication date and explanation of relevance. |

| Security | Gemini keys remain server-side; validate input; enforce ownership checks for user-specific data; do not expose secrets in logs. |

| Compatibility | Android via Expo; test on at least two devices or emulators if available. |

| Data minimization | Use public source data; collect only profile information needed for personalization; avoid sensitive personal data. |

| Truthfulness | Do not invent publication dates, source URLs, evidence, adoption statistics or trend claims. |



6. Architecture

Mobile app (React Native + Expo + TypeScript) ⇄ REST API (Python + FastAPI) ⇄ PostgreSQL. A separate ingestion worker/command fetches source items, deduplicates them, calls Gemini, validates structured output and stores results.

| Layer | Choice / responsibility |

| Mobile | Expo, React Native, TypeScript, Expo Router; TanStack Query or equivalent for server state. |

| API | FastAPI, Pydantic; versioned REST endpoints; authentication/ownership checks as required by demo mode. |

| Database | PostgreSQL, SQLAlchemy 2.x, Alembic migrations. |

| AI | Gemini called only by backend; provider-specific code isolated behind a service interface. |

| Ingestion | Initial scheduled/manual worker. Avoid complex queue infrastructure for the four-day build. |

| Testing | Pytest for backend; API integration tests; mobile smoke tests. |



6.1 Pipeline

Fetch source records and normalize metadata.

Canonicalize URLs where safe; compute hashes and deduplicate.

Persist source records before AI enrichment.

Call Gemini for structured classification and explanation.

Validate output; store enrichment status and errors.

Link one or more source records to a canonical discovery.

Calculate deterministic relevance and expose the feed through the API.

Persist user actions and roadmap changes.

7. Data Model

Important modeling rule: source items and canonical discoveries are separate entities. One technology development can be supported by several source records. This avoids treating every duplicate announcement as a new discovery.

| Table | Key fields / purpose |

| users | id UUID PK; email unique if auth enabled; password_hash only if password auth is implemented; timestamps. |

| student_profiles | user_id PK/FK; display_name; experience_level; career_goal; interests JSONB; weekly_study_minutes; updated_at. |

| sources | id; name; source_type; base_url; feed_url; is_active; last_fetched_at. |

| source_items | id; source_id FK; external_id; title; canonical_url; author/publisher; published_at nullable; fetched_at; content_text; content_hash; raw_metadata JSONB; processing_status. |

| ingestion_runs | id; source_id FK; started_at; finished_at; status; items_fetched; items_failed; error_summary. |

| discoveries | id; title; summary; category; discovery_type; applications; why_it_matters; evidence_level New/Emerging; status; timestamps. |

| discovery_evidence | discovery_id FK; source_item_id FK; evidence_role; unique(discovery_id, source_item_id). |

| skills | id; name; unique slug; description; category; difficulty. |

| discovery_skills | discovery_id FK; skill_id FK; relevance; relationship_type; unique pair. |

| user_discovery_state | user_id FK; discovery_id FK; state saved/dismissed; relevance_score; score_reason; updated_at; unique user/discovery. |

| skill_prerequisites | skill_id FK; prerequisite_id FK; composite key; no self-edge; validate cycles. |

| skill_resources | id; skill_id FK; title; url; resource_type; provider; is_verified; mini_project. |

| roadmaps | id; user_id FK; title; created_at; updated_at. |

| roadmap_items | id; roadmap_id FK; skill_id FK; added_from_discovery_id nullable FK; status; position; target_date; notes; prevent duplicate skill per roadmap unless intentionally supported. |



For a single-device demo, user authentication can be simplified, but the mode must be explicit. If real accounts are supported, never authorize access by trusting a user_id supplied in a query string; derive identity from the authenticated session/token.

8. API Endpoints (MVP Draft)

| Method | Endpoint | Purpose |

| POST | /api/v1/profile | Create or initialize demo profile; use /auth/register if account auth is implemented. |

| GET | /api/v1/profile | Get current profile. |

| PUT | /api/v1/profile | Update interests, skills, experience, goal and weekly time. |

| GET | /api/v1/discoveries | Paginated, ranked feed with score and reason. |

| GET | /api/v1/discoveries/{id} | Detail, related skills and evidence links. |

| POST | /api/v1/discoveries/{id}/actions | Set saved/dismissed state. |

| GET | /api/v1/saved | List saved discoveries. |

| GET | /api/v1/roadmaps | List current user's roadmaps. |

| POST | /api/v1/roadmaps | Create a roadmap. |

| GET | /api/v1/roadmaps/{id} | Get ordered roadmap with prerequisites and resources. |

| POST | /api/v1/roadmaps/{id}/items | Add skill to roadmap. |

| PATCH | /api/v1/roadmaps/{id}/items/{item_id} | Update To do/In progress/Done status or order. |

| DELETE | /api/v1/roadmaps/{id}/items/{item_id} | Remove roadmap item. |

| GET | /api/v1/health | Health check. |



Internal ingestion should be triggered by a scheduled worker or a protected developer/admin command, not an unrestricted public endpoint. Use consistent errors, validation and pagination.

9. Mobile Screens

| Screen | Required content |

| Onboarding / Profile | Interests, current skills, experience level, career goal, weekly study time. |

| Radar Feed | Cards with title, source, publication date if known, summary preview, New/Emerging label, score reason, Save and Dismiss. |

| Discovery Detail | Summary, applications, why it matters, related skills, confidence/limitations, evidence links, Add to Roadmap. |

| Saved | Saved discoveries and ability to reopen details. |

| Roadmap | Prerequisite-aware skills, status, resources, mini-project and progress. |



Suggested bottom navigation: Discover · Roadmap · Saved · Profile. Provide loading, empty, retry and offline/error states.

10. Acceptance Criteria and Testing

10.1 Definition of done

Android app launches and retrieves discoveries from the API.

At least one configured real source contributes actual source-backed content.

Gemini-generated explanations are stored and retrieved; fallback items are clearly marked.

Original URLs and available publication dates are preserved accurately.

Repeated ingestion creates no duplicate source records.

Student can save a discovery and add its related skill to a roadmap.

Roadmap status persists after app restart.

Feed exposes an explainable relevance score or reason.

At least 30 processed discovery records are available if source volume and time allow; live and seeded counts are reported separately.

The demo can be reproduced from documented setup instructions.

10.2 Minimum test matrix

| Scenario | Expected result |

| Same source item ingested twice | No duplicate source record. |

| Source timeout or HTTP failure | Failure recorded; other ingestion work continues. |

| Gemini invalid JSON / timeout | Output rejected; bounded retry; item marked pending/failed; API remains available. |

| Same development in multiple sources | Separate evidence records can support one discovery; copied items do not count as independent evidence. |

| Missing published date | Date remains unknown; system does not invent one. |

| Save/dismiss action | State persists and feed behavior reflects it. |

| Add skill to roadmap | Item persists after app restart. |

| Access another user's roadmap | Request denied when accounts/auth are enabled. |

| Untrusted source text includes instructions | Treated as data; never executed or allowed to override system behavior. |

| No network / source unavailable | Useful error or clearly labelled stored fallback; app does not crash. |



10.3 Quality targets

Manually review a sample of 20 summaries; target at least 90% judged faithful to their supplied source text.

No item is labelled Emerging unless the configured evidence rule is met.

Every displayed discovery has at least one working source link; seeded records must be visibly identified as demo/sample data.

Test on two Android devices or emulators if available.

11. Risks and Mitigations

| Risk | Mitigation |

| Four days too short for four sources | Start with arXiv and one RSS feed; other connectors are stretch goals. |

| Gemini rate limits or outage | Enrich at ingestion, store output, bounded retries and clearly labelled fallback data. |

| Hallucinated claims or links | Ground prompts in source text; validate schema; attach evidence IDs/URLs in backend; manually review samples. |

| Overclaiming 'Emerging' | Default to New; require corroborating or strong attributable evidence. |

| Duplicate discoveries | Separate source items from canonical discoveries; idempotency and uniqueness constraints. |

| Roadmap prerequisites are wrong/cyclic | Use curated map; validate cycles; unmatched skills get no invented prerequisites. |

| Integration delay | Freeze API contracts at the start; build against mock responses first. |

| Demo network failure | Keep stored records and labelled seeded fallback; rehearse failure behavior. |

| Secret or user-data exposure | Keep Gemini key server-side; validate auth/ownership; avoid logging secrets. |



12. Success Metrics

Demo success

The complete discovery → explanation/evidence → save → roadmap journey runs without manual database edits.

The ranking reason and the New/Emerging label of any item can be explained.

Source-backed and seeded records are clearly distinguished.

The app remains usable when a source or Gemini is temporarily unavailable.

Quality metrics

At least 90% of a manually reviewed sample of 20 summaries is faithful to the source.

100% of displayed discoveries have a valid source URL or are explicitly labelled as seeded demo data.

No Emerging label without the evidence rule.

Track saves, roadmap additions and completed roadmap items for later product evaluation.

13. Future Scope

Push notifications for high-relevance discoveries.

More GitHub and official release-blog integrations.

Longitudinal trend detection after sufficient historical data is collected.

Semantic matching/vector search when keyword and relational matching prove insufficient.

Learned ranking after meaningful user-feedback data exists.

Richer roadmap analytics, collaboration and multi-agent research workflows.

14. Open Decisions Before Build Starts

Select the initial arXiv categories and the exact first RSS feed.

Choose local-network backend vs hosted backend for the Android demo.

Choose authentication mode: real accounts or a clearly scoped single-device demo profile.

Agree on the exact definition of a canonical discovery and the evidence threshold for Emerging.

15. Final Recommendation

Proceed with a tightly scoped four-day MVP. First deliver one real source-to-mobile path using arXiv and one RSS feed, with stored Gemini enrichment and original evidence. Then add save/dismiss, profile-aware ranking and a persistent curated roadmap. Add GitHub and official release blogs only after the core journey passes its acceptance tests. This document describes intended requirements and does not imply implementation or test completion.
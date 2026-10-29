# SkillRadar AI — TASKS.md (v2: domain-first roadmap)

Workflow: **Login → Pick domain → Roadmap → "Add latest skills" (papers + model releases) → Learn each skill (videos + notes + mini-project)**
Platform: Android (Expo) · Timeline: 4 days · Replaces the v1 task list.

Legend: `[ ]` to do · `[~]` in progress · `[x]` done · **P0** must have · **P1** stretch

Rules for this file:
- Tick a box only after its check has actually passed. Code existing is not "done".
- Do not start P1 until every P0 task in the current phase is done.
- Content tasks (Track C) are human-led. Agents build the tooling, never the curated facts.

---

## What changed from PRD v1.1

| Area | v1.1 | v2 |
| --- | --- | --- |
| Home screen | Radar feed | Domain roadmap |
| Discoveries | Main feed with save/dismiss | Source of "latest skill" suggestions, shown on request |
| Auth | Open decision | Real accounts (P0) |
| Roadmap | Built from a saved discovery | Starts from a curated domain template, then grows |
| Learning | Resources + mini-project | Per-skill Learn page: curated videos, study notes, personal notes, mini-project |
| Sources | arXiv + 1 RSS, releases = stretch | arXiv + 1 **model-release** feed are both P0 |

Unchanged principles: evidence first, never invent dates/URLs/IDs, live vs seeded labelled, Gemini only in the backend and only at ingestion/batch time, source text treated as untrusted.

---

## Phase 0 — Decisions (~2 hours, before building)

Record answers in `docs/DECISIONS.md`.

- [x] **T0.1 (P0)** Pick **3 launch domains** (e.g. AI Engineering, Full-Stack & Mobile, Cloud & DevOps).
- [x] **T0.2 (P0)** List ~8 curated skills per domain with prerequisite links (shared skills allowed).
- [x] **T0.3 (P0)** Pick arXiv categories and map them to domains (e.g. `cs.AI`, `cs.LG`, `cs.CL`).
- [x] **T0.4 (P0)** Pick one **model-release feed** (official RSS/Atom). Record URL and terms of use.
- [x] **T0.5 (P0)** Auth: email + password or Google sign-in; token approach (access token, expiry).
- [x] **T0.6 (P0)** Demo hosting: local network vs hosted backend.
- [x] **T0.7 (P0)** Define the **suggestion rule**: eligible age window, minimum enrichment quality, how an extracted skill maps to a domain, labels `PAPER` / `RELEASE`, and the evidence rule for `EMERGING` (default `NEW`).
- [x] **T0.8 (P0)** Video playback: official embed vs link-out to YouTube. No downloading or scraping.
- [x] **T0.9 (P0)** Name the **content curator** (a human) responsible for verifying every video and reviewing every note.
- [x] **T0.10 (P0)** Freeze the API contract (OpenAPI or typed schema) so mobile and backend can build against mocks.

**Check:** every item above has a written answer in `docs/DECISIONS.md`.

---

## Track C — Content (human-led, runs in parallel all four days)

Content is the riskiest part of the plan. Budget: 3 domains × ~8 skills × ≥1 (target 2) videos ≈ 24–48 videos.

Content lives in `content/` as versioned files (YAML or JSON), loaded by a script.

- [x] **C1 (P0)** Day 1: finalise skills + prerequisites per domain (from T0.2) as content files.
- [x] **C2 (P0)** Day 1–2: curator picks and verifies videos (opens each, confirms it exists, is on-topic, and is not region-blocked or removed). Target ≥1 per skill, 2 where possible.
- [x] **C3 (P0)** Day 2: curator writes `overview`, `outline` and `mini_project` per skill.
- [x] **C4 (P0)** Day 3: batch-generate **study notes** with Gemini from each skill's outline (see T2.12). Output stored as `pending_review`.
- [x] **C5 (P0)** Day 3–4: curator reviews and approves notes. Only `approved` notes are served to the app.
- [x] **C6 (P0)** Day 4: spot-check ≥20 notes and all video links one final time. Record in `docs/QUALITY.md`.

**Check:** no skill shows a video or note in the app that a human has not verified or approved.

---

## Phase 1 — Day 1: Foundation, auth, schema, contracts

### Repo and tooling
- [x] **T1.1 (P0)** Monorepo: `backend/`, `mobile/`, `content/`, `docs/`.
- [x] **T1.2 (P0)** FastAPI skeleton, env-based config, `/api/v1/health`.
- [x] **T1.3 (P0)** PostgreSQL, SQLAlchemy 2.x, Alembic initialised.
- [x] **T1.4 (P0)** Expo skeleton: TypeScript, Expo Router, TanStack Query.
- [x] **T1.5 (P0)** `.env.example` for backend (DB URL, `GEMINI_API_KEY`, JWT secret, admin token) and mobile (API base URL). No secrets committed.
- [x] **T1.6 (P0)** If using Stitch: generate `DESIGN.md` through the Stitch MCP and commit it as the UI source of truth.

### Auth
- [x] **T1.7 (P0)** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`; password hashing with a strong algorithm (argon2 or bcrypt); token-based sessions.
- [x] **T1.8 (P0)** Auth dependency used by every user-specific route; identity comes from the token only.
- [x] **T1.9 (P0)** Basic rate limiting or lockout on login attempts.

### Data model
- [x] **T1.10 (P0)** Migrations: `users`, `user_profiles` (selected domain, experience level, weekly study minutes), `domains`, `skills`, `domain_skills`, `skill_prerequisites` (no self-edge, cycle check).
- [x] **T1.11 (P0)** Migrations: `skill_lessons` (overview, mini_project), `lesson_videos` (youtube_id, title, channel, verified, verified_on, position), `skill_notes` (content_md, origin, status `pending_review|approved`, reviewed_at), `user_notes` (user_id, skill_id, optional video_id, content, updated_at).
- [x] **T1.12 (P0)** Migrations: `roadmaps` (user_id, domain_id), `roadmap_items` (skill_id, status, position, `source` = `curated|suggested`, `added_from_discovery_id`, notes), unique skill per roadmap.
- [x] **T1.13 (P0)** Migrations: `sources`, `source_items`, `ingestion_runs`, `discoveries`, `discovery_evidence`, `discovery_skills`, `user_discovery_state` (suggested/added/dismissed, score, reason).
- [x] **T1.14 (P0)** Constraints: unique `(source_id, external_id)` / content hash, unique `(discovery_id, source_item_id)`, unique `(user_id, discovery_id)`, unique skill slug.

### Mock-first mobile
- [x] **T1.15 (P0)** Pydantic schemas for all endpoints per the frozen contract.
- [x] **T1.16 (P0)** Mobile mock API returning fixtures for every screen.
- [x] **T1.17 (P0)** Navigation shell: Auth stack, then tabs (Roadmap · Learn/Library · Saved · Profile).

**Day 1 check:** migrations apply to an empty DB, a user can register and log in, `/auth/me` works, the Expo app runs on an emulator with mock data across all screens.

---

## Phase 2 — Day 2: Content loader, ingestion, Gemini

### Content loader
- [x] **T2.1 (P0)** Loader that validates and imports `content/` into the DB: schema check, prerequisite cycle check, unknown prerequisite check, duplicate slug check.
- [x] **T2.2 (P0)** Loader refuses videos with `verified: false` and never fabricates video fields.
- [x] **T2.3 (P0)** Seed the three domains and their skills. Idempotent: running twice makes no duplicates.
- [x] **T2.4 (P1)** Optional script that checks each `youtube_id` still resolves (public oEmbed). Manual verification stays the source of truth.

### Ingestion (command/worker only, never on request)
- [x] **T2.5 (P0)** arXiv fetcher: normalise title, external id, canonical URL, authors, published date, abstract, fetch time.
- [x] **T2.6 (P0)** Model-release feed fetcher with the same fields. Missing date stays `NULL`.
- [x] **T2.7 (P0)** Canonical URL + content hash; idempotent upsert; no duplicate source items on re-run.
- [x] **T2.8 (P0)** `ingestion_runs` tracking, bounded retries, timeouts; one source failing does not stop the other.
- [x] **T2.9 (P0)** CLI: `python -m app.ingest --source all`. Any HTTP trigger is admin-protected.
- [x] **T2.10 (P0)** Persist source records before AI enrichment.

### Gemini
- [x] **T2.11 (P0)** `EnrichmentService` interface + Gemini implementation. Structured output: 2–3 sentence summary, category, applications, normalised skill names, why-it-matters, insufficient-evidence flag. Pydantic validation, one retry, then mark failed.
- [x] **T2.12 (P0)** Batch **study-notes generator**: input is the curator's `overview` + `outline` only; output stored as `pending_review`, `origin = ai_generated`. The prompt must not claim anything about video contents.
- [x] **T2.13 (P0)** Prompts treat source text as untrusted data; backend attaches URLs and IDs, never Gemini.
- [x] **T2.14 (P0)** Create/link canonical discoveries and evidence rows; map skill names to curated skills; unmatched skills stay standalone with no invented prerequisites.
- [x] **T2.15 (P0)** Label logic: `PAPER` / `RELEASE` from source type; `NEW` by default; `EMERGING` only if the T0.7 rule is met.
- [x] **T2.16 (P0)** Fallback: if Gemini is down, keep source data and mark items pending. The API still works.

**Day 2 check:** content loads cleanly, ingestion run twice gives identical source-item counts, enriched discoveries exist with valid schema, a prompt-injection test string has no effect.

---

## Phase 3 — Day 3: Core backend flow + core mobile screens

### Backend
- [x] **T3.1 (P0)** `GET /domains`; `PUT /profile` (domain, experience, weekly time).
- [x] **T3.2 (P0)** `POST /roadmaps` from a domain: builds the curated, prerequisite-ordered roadmap. `GET /roadmaps/current`.
- [x] **T3.3 (P0)** Roadmap item routes: add, `PATCH` status/order, `DELETE`. Status: To do / In progress / Done. Persisted per user.
- [x] **T3.4 (P0)** `GET /roadmaps/{id}/suggestions` — **on request only**, served from stored enriched discoveries. It must not call Gemini or fetch sources at request time.
- [x] **T3.5 (P0)** Deterministic ranking for suggestions: domain fit, skill overlap with the roadmap, experience/prerequisite fit, recency, evidence strength. Each suggestion returns a short `reason`, source label, date (or unknown), and evidence links.
- [x] **T3.6 (P0)** Accept / dismiss a suggestion. Accepting inserts the skill at a prerequisite-correct position with `source = suggested` and `added_from_discovery_id`.
- [x] **T3.7 (P0)** `GET /skills/{id}/learn`: overview, verified videos, **approved** study notes, mini-project, prerequisites. For suggested skills with no curated content: abstract-based overview, "No verified video yet", no invented prerequisites.
- [x] **T3.8 (P0)** Personal notes: `GET/PUT /skills/{id}/notes/me`. Owner-only.
- [x] **T3.9 (P0)** Ownership checks on roadmaps, items, notes, discovery state.
- [x] **T3.10 (P0)** Indexes so stored roadmap and suggestion responses stay under 2 s.

### Mobile (swap mocks for the real API)
- [x] **T3.11 (P0)** Login / Register screens.
- [x] **T3.12 (P0)** Domain selection screen (first run after login, changeable later).
- [x] **T3.13 (P0)** Roadmap screen: prerequisite-aware list, status control, progress, "Add latest skills" button.
- [x] **T3.14 (P0)** Loading, empty, retry and offline/error states on every data screen.

**Day 3 check:** from an emulator — register, pick a domain, see the roadmap, tap "Add latest skills", accept one suggestion, see it appear in the roadmap, and have it persist after a restart.

---

## Phase 4 — Day 4: Learn experience, suggestions UI, tests, demo

### Mobile
- [x] **T4.1 (P0)** Suggestions screen/sheet: cards with `PAPER`/`RELEASE` label, `NEW`/`EMERGING` label, reason, date or "DATE UNKNOWN", evidence links, Accept/Dismiss, and live/demo labelling.
- [x] **T4.2 (P0)** **Learn screen** per skill: overview, video list (per T0.8), study notes (labelled "AI-generated study notes, reviewed"), personal notes editor with autosave, mini-project, status control.
- [x] **T4.3 (P0)** Suggested skills without curated content show "No verified video yet" and an abstract-based overview, clearly labelled.
- [x] **T4.4 (P0)** Profile screen (domain, experience, weekly time, logout).
- [ ] **T4.5 (P1)** Saved suggestions list; per-video "watched" marker.

### Tests (minimum matrix)
- [x] **T4.6 (P0)** Same source item ingested twice → no duplicate.
- [x] **T4.7 (P0)** Source timeout/HTTP failure → recorded; the other source continues.
- [x] **T4.8 (P0)** Gemini invalid JSON/timeout → rejected, bounded retry, item pending/failed, API stays up.
- [x] **T4.9 (P0)** Same development in multiple sources → separate evidence rows, one discovery; copies are not independent evidence.
- [x] **T4.10 (P0)** Missing published date stays unknown.
- [x] **T4.11 (P0)** Suggestions endpoint makes no Gemini or network calls.
- [x] **T4.12 (P0)** Accepting a suggestion inserts it correctly and persists after restart.
- [x] **T4.13 (P0)** Roadmap status persists after restart.
- [x] **T4.14 (P0)** User A cannot read or edit user B's roadmap or notes.
- [x] **T4.15 (P0)** Unapproved notes and unverified videos are never returned by the API.
- [x] **T4.16 (P0)** Prerequisite cycle rejected by the loader; unmatched skills get no invented prerequisites.
- [x] **T4.17 (P0)** Prompt-injection text in a source is treated as data.
- [x] **T4.18 (P0)** Auth: wrong password rejected; expired/invalid token rejected; password never logged or returned.
- [x] **T4.19 (P0)** Mobile smoke tests: login, domain pick, roadmap, suggestions, learn.

### Quality and demo
- [x] **T4.20 (P0)** Review 20 AI-generated items (notes + discovery summaries) against their inputs; target ≥90% faithful. Record in `docs/QUALITY.md`.
- [x] **T4.21 (P0)** Every video link opens; every suggestion has a working source link or a visible demo label.
- [x] **T4.22 (P0)** No item labelled `EMERGING` unless the rule is met.
- [x] **T4.23 (P0)** Seed script for demo suggestions, every record visibly flagged as demo. Report live vs seeded counts separately.
- [x] **T4.24 (P0)** README with reproducible setup (env, migrations, content load, ingestion, seed, run backend and app).
- [x] **T4.25 (P0)** Rehearse the full demo including a simulated source/Gemini/network failure. Test on two Android devices/emulators if available.

**Day 4 check:** the full journey runs from a clean setup without manual DB edits: login → domain → roadmap → add latest skills → open a skill → watch a verified video → read approved notes → write a personal note → mark Done → restart → state persists.

---

## Stretch (P1) — only after all P0 passes

- GitHub release/repo signals as extra evidence.
- More domains and videos.
- Video watched-progress and learning streaks.
- Notes export.
- Search across skills and notes.
- Link-health checker run on a schedule.

## Deferred (do not build)

Push notifications · vector DB / RAG infrastructure · multi-agent workflows · social features · gamification · ML ranking · trend forecasting claims · auto-generated video recommendations · scraping or downloading videos.

---

## Dependencies

```
T0.x ──► T1.x ──► T2.1–T2.4 (content loader) ──► T3.2, T3.7
                └─► T2.5–T2.16 (ingestion + AI) ──► T3.4–T3.6 ──► T4.1
Track C (curation) ──► T2.12 (notes batch) ──► C5 review ──► T3.7, T4.2
T1.7–T1.9 (auth) ──► T3.9 ──► T4.14
```

Note: the Learn screen (T4.2) is blocked by curator review (C5). Start Track C on Day 1.

## Cut order if time runs short

1. Drop all P1.
2. Reduce to **2 domains**, keeping each skill with at least one verified video.
3. Reduce skills per domain to ~6.
4. Use Google sign-in only, or email only, not both.
5. Never cut: verified-video and approved-notes gates, evidence links, live/seeded labelling, schema validation, idempotent ingestion, ownership checks, persistence.

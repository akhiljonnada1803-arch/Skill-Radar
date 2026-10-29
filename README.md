# SkillRadar AI — Domain-First Roadmap & Technology Radar (v2)

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Expo](https://img.shields.io/badge/Expo-51.0+-000020.svg?logo=expo)](https://expo.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13+-336791.svg?logo=postgresql)](https://www.postgresql.org)
[![Python](https://img.shields.io/badge/Python-3.14+-3776AB.svg?logo=python)](https://www.python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)

SkillRadar AI is an Android (Expo) application that discovers emerging technology developments from real public sources (arXiv preprints, Google AI releases, Simon Willison weblogs), explains them using Gemini AI, attaches original verifiable evidence links, ranks them deterministically for a student's profile, and lets the student add related skills to a persistent, prerequisite-aware learning roadmap.

> **v2 Core Flow:** **Login $\longrightarrow$ Pick Domain $\longrightarrow$ Curated Roadmap $\longrightarrow$ "Add Latest Skills" (papers + model releases) $\longrightarrow$ Learn Each Skill (verified videos + reviewed study notes + mini-project + personal notes scratchpad)**

---

## 🏛️ Architecture & Layout

```
SkillRadar/
├── backend/
│   ├── app/
│   │   ├── api/v1/         # Versioned REST endpoints (auth, domains, roadmaps, skills, profile, discoveries)
│   │   ├── core/           # Security (bcrypt, JWT, lockout), DB config, settings
│   │   ├── models/         # SQLAlchemy 2.x models (Domain, Skill, LessonVideo, SkillNote, UserNote, Roadmap)
│   │   ├── schemas/        # Pydantic v2 schemas (strict frozen contract)
│   │   ├── services/
│   │   │   ├── content_loader.py  # Content loader, cycle DFS, unverified video gating
│   │   │   ├── notes_gen.py       # Batch AI study notes generator from curator outline
│   │   │   ├── roadmap.py         # Prerequisite-correct insertion & topological ordering
│   │   │   ├── suggestions.py     # Deterministic on-request ranking (zero Gemini/network during browsing)
│   │   │   └── ingestion/         # arXiv, RSS fetchers, canonicalization, failure isolation
│   │   └── seeds/          # Labelled demo discoveries, seed loaders
│   ├── alembic/            # Database schema migrations
│   └── tests/              # 22 automated integration and test-matrix suites
├── mobile/
│   ├── app/                # Expo Router screens (Auth, Domain Select, Roadmap, Suggestions, Learn, Profile)
│   ├── src/
│   │   ├── api/            # API client (JWT auth, offline mock fallback)
│   │   ├── context/        # React AuthContext
│   │   └── types/          # TypeScript domain models
│   └── tests/              # TypeScript verification & mobile smoke tests
├── content/                # Human-curated domain catalogs & 24 skill dossiers
│   ├── domains.json        # 3 launch domains
│   └── skills/*.json       # 24 verified competencies with YouTube video IDs and outlines
├── DESIGN.md               # Field Survey Expedition Log UI design tokens
└── docs/
    ├── DECISIONS.md        # Phase 0 architectural & product decisions (T0.1–T0.10)
    ├── API_CONTRACT.md     # Frozen v2 API specification
    └── QUALITY.md          # 20-sample faithfulness audit, video link audit, evidence benchmarks
```

---

## 🚀 Quickstart Setup Guide

### 1. Prerequisites
- Python 3.11+ (Python 3.14 verified)
- Node.js 18+ and npm
- PostgreSQL 13+ running locally on port 5432

### 2. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env to set your DATABASE_URL, GEMINI_API_KEY, and JWT_SECRET_KEY
```

#### Run Database Migrations
```bash
python -m alembic upgrade head
```

#### Load Curated Domains & Skills (Track C)
Imports the 3 launch domains and 24 curated skills with verified YouTube videos:
```bash
python -m app.content_loader
```

#### Generate & Approve AI Study Notes (T2.12, C5)
Generates structured markdown study notes strictly from curator outlines and approves them:
```bash
python -m app.notes_gen --approve
```

#### Seed Labelled Demo Discoveries (T4.23)
```bash
python -m app.seeds.demo
```

#### Run Real Ingestion (Fetches live arXiv & Google AI feeds)
```bash
python -m app.ingest --source all
```

#### Start FastAPI Server
```bash
python -m uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000/api/v1`
- Interactive OpenAPI Docs: `http://localhost:8000/api/v1/docs`
- Health check: `http://localhost:8000/api/v1/health`

---

### 3. Mobile App Setup (Expo Android)

```bash
cd mobile

# Install dependencies
npm install --legacy-peer-deps

# Configure environment variables
cp .env.example .env
# For Android emulator: EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
# For physical phone / web: EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:8000

# Run mobile smoke tests
npm test

# Start Expo development server
npx expo start
```
- Press `a` in the terminal to launch on connected Android emulator.
- Press `w` to run in web browser.

---

## 🧪 Automated Test Suites

### Backend Pytest Suite (22 Tests Passed)
```bash
cd backend
python -m pytest tests -v
```
**Test Matrix Coverage:**
- **T4.6:** Ingesting same source item twice $\to$ idempotent deduplication; no duplicate rows.
- **T4.7:** Source failure / timeout $\to$ recorded in `ingestion_runs`; other sources continue.
- **T4.8:** Gemini invalid JSON / offline $\to$ graceful heuristic fallback; API stays fully up.
- **T4.9:** Multiple sources for single development $\to$ separate evidence rows; copied articles are not independent.
- **T4.10:** Missing publication date $\to$ stays `NULL` / unknown; never fabricated.
- **T4.11:** `GET /roadmaps/{id}/suggestions` $\to$ served strictly on-request from DB with zero Gemini/network latency.
- **T4.12:** Accepting suggestion $\to$ inserts skill at prerequisite-correct position with `source = 'suggested'`.
- **T4.13:** Roadmap status toggle (`todo` $\to$ `in_progress` $\to$ `done`) persists across restarts.
- **T4.14:** Cross-user isolation $\to$ User A cannot read or modify User B's roadmap, items, or notes (HTTP 403).
- **T4.15:** Content gating $\to$ Unverified videos (`verified == False`) and unapproved notes (`status != 'approved'`) are never returned by `/skills/{id}/learn`.
- **T4.16:** Prerequisite cycle detection $\to$ Recursive cycles rejected by loader with `CycleDetectedError`; unmatched skills get no invented prerequisites.
- **T4.17:** Prompt injection $\to$ Malicious source abstract treated strictly as data within delimiters.
- **T4.18:** Auth security $\to$ Wrong password rejected (HTTP 401), invalid/expired token rejected (HTTP 401), query `?user_id=...` strictly blocked (HTTP 400), password hashes never exposed.

### Mobile Verification & Smoke Tests
```bash
cd mobile
npm test
```
**Mobile Smoke Checks:**
1. Auth login & token issuance
2. Domain catalog retrieval (3 launch domains)
3. Domain roadmap & prerequisite ordering
4. Status progression (`todo` $\to$ `in_progress` $\to$ `done`)
5. Suggestions on-request with score reasons & evidence links
6. Learn competency dossier & video gating
7. Personal notes autosave & persistence

---

## 🛡️ Non-Negotiable Rules & Quality Guarantees

1. **Truthfulness and Evidence:**
   - Publication dates are never invented. Unknown dates stay `NULL`.
   - Source URLs and evidence IDs are attached strictly by backend code, never produced by Gemini.
   - Live vs Seeded data is visibly distinguished in DB, API (`is_seeded`), and UI (`[LIVE SOURCE]` vs `[DEMO DATA]`).
2. **Emerging vs New:**
   - Default label is strictly `NEW`.
   - `EMERGING` is applied ONLY when corroborated by $\ge 2$ independent source domains or major lab releases. Copied reports do not count.
3. **Video Playback & Verification:**
   - Playback is official embed / link-out to YouTube. No downloading or scraping.
   - Only human-verified videos (`verified: true`) are served.
4. **Study Notes Review Gate:**
   - AI study notes are generated batch-wise strictly from curator outlines and saved as `pending_review`.
   - Only notes reviewed and marked `approved` by curator Alex Rivera are served.
5. **Deterministic Explainable Ranking:**
   - Score calculated from domain fit, skill overlap, experience fit, recency, and evidence strength. Always provides a human-readable `score_reason`.
6. **Strict Cross-User Isolation:**
   - Identity derived strictly from JWT Bearer tokens. Query parameter `?user_id=...` is rejected with HTTP 400.

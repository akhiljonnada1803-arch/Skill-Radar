# SkillRadar AI — Domain-First Roadmap & Technology Radar (v2.0)

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![Expo](https://img.shields.io/badge/Expo-51.0+-000020.svg?logo=expo)](https://expo.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg?logo=postgresql)](https://www.postgresql.org)
[![Neon](https://img.shields.io/badge/Neon-Serverless_Postgres-00E599.svg?logo=postgresql)](https://neon.tech)
[![Google Cloud Run](https://img.shields.io/badge/Google_Cloud-Run-4285F4.svg?logo=googlecloud)](https://cloud.google.com/run)
[![Google Gemini](https://img.shields.io/badge/Google-Gemini_Flash-8E75B2.svg?logo=google)](https://aistudio.google.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python)](https://www.python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)

SkillRadar AI is an autonomous engineering telemetry radar and personalized learning companion. It discovers emerging technology developments from verified public feeds (Google News AI, arXiv preprints, frontier lab releases from Anthropic and OpenAI), explains technical jargon upfront using **Google Gemini AI** with plain-English definitions and everyday analogies, attaches verifiable evidence links, ranks them deterministically for an engineer's profile, and allows learners to slot related competencies directly into a persistent, prerequisite-aware curriculum roadmap.

> **v2 Core Flow:** **Login $\longrightarrow$ Pick Domain $\longrightarrow$ Curated Roadmap $\longrightarrow$ Browse Live Radar (Notification Sorting + Jargon Buster) $\longrightarrow$ 1-Tap Roadmap Enrollment $\longrightarrow$ Learn Each Skill (Verified Videos + Reviewed Study Notes + Hands-on AI Missions)**

---

## 🏛️ System Architecture

```
SkillRadar/
├── backend/
│   ├── Dockerfile              # Production multi-stage container for Google Cloud Run
│   ├── .dockerignore           # Container build exclusion rules
│   ├── requirements.txt        # Backend dependencies (FastAPI, SQLAlchemy, jose, passlib, bcrypt, etc.)
│   ├── app/
│   │   ├── api/v1/             # REST endpoints (auth, domains, roadmaps, skills, discoveries, admin)
│   │   ├── core/               # Security (bcrypt, JWT, lockout), DB config, settings (lifespan auto-ingest)
│   │   ├── models/             # SQLAlchemy 2.x models (Domain, Skill, Discovery, KeyTerms, User, Roadmap)
│   │   ├── schemas/            # Pydantic v2 schemas (strict frozen contract with key_terms)
│   │   ├── services/
│   │   │   ├── content_loader.py    # Curated domain/skill loader & unverified video gating
│   │   │   ├── notes_gen.py         # Batch AI study notes generator
│   │   │   ├── roadmap.py           # Prerequisite-correct insertion & topological ordering
│   │   │   ├── suggestions.py       # Deterministic ranking engine
│   │   │   ├── enrichment/          # Gemini AI synthesis, jargon buster, and fallback heuristics
│   │   │   └── ingestion/           # arXiv, Google News RSS, canonicalization, failure isolation
│   │   └── seeds/              # Seed loaders & migration scripts
│   │       ├── enhance_with_simple_language_and_jargon.py  # 184-item plain-English & jargon seed
│   │       ├── ingest_frontier_sources.py                  # Live Google News AI stream ingest
│   │       ├── migrate_local_to_neon.py                    # Local to Neon Postgres cloud migrator
│   │       └── seed_fullstack_roadmap.py                   # Full-Stack AI domain roadmap seed
│   └── tests/                  # 22 automated integration and test-matrix suites
├── mobile/
│   ├── vercel.json             # SPA rewrite configuration for Vercel Web deployment
│   ├── app/                    # Expo Router screens (Auth, Domain Select, Roadmap, Discovery [id], Skill [id])
│   ├── src/
│   │   ├── api/                # API client with adaptive platform base URL & offline mock fallback
│   │   ├── context/            # React AuthContext
│   │   ├── theme/              # Crimson Monolith aesthetic palette tokens
│   │   └── types/              # TypeScript domain models (KeyTermItem, DiscoveryCardItem, etc.)
│   └── tests/                  # TypeScript verification & mobile smoke tests
├── docs/
│   ├── APPLICATION_WORKSHEET.md # Completed product health check & hackathon worksheet
│   ├── DECISIONS.md            # Phase 0 architectural & product decisions
│   ├── API_CONTRACT.md         # Frozen v2 API specification
│   └── QUALITY.md              # Evidence benchmarks & quality audit
└── content/                    # Human-curated domain catalogs & verified skill dossiers
```

---

## 🚀 Quickstart & Deployment Guide

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+** and npm
- **PostgreSQL 14+** (Local or [Neon.tech](https://neon.tech) cloud database)

---

### 2. Backend Setup (Local & Docker)

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Set DATABASE_URL, GEMINI_API_KEY (optional), and JWT_SECRET_KEY
```

#### Run Database Initializer & Seeds
```bash
# Initialize schema and seed 184 enriched discoveries with jargon terms:
python app/seeds/enhance_with_simple_language_and_jargon.py
python app/seeds/seed_fullstack_roadmap.py
```

#### Start FastAPI Server
```bash
uvicorn app.main:app --reload --port 8000
```
- API Base: `http://localhost:8000/api/v1`
- Interactive Swagger Docs: `http://localhost:8000/api/v1/docs`
- Health check: `http://localhost:8000/api/v1/health`

---

### 3. Cloud Deployment (Google Cloud Run + Neon PostgreSQL)

#### Step A: Database (Neon Serverless PostgreSQL)
1. Create a project at [Neon.tech](https://neon.tech).
2. Migrate all local data with the built-in migration script:
   ```bash
   python backend/app/seeds/migrate_local_to_neon.py
   ```

#### Step B: Backend (Google Cloud Run)
```bash
gcloud auth login
gcloud run deploy skillradar-backend \
  --source backend \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

#### Step C: Automated Telemetry Ingestion (Google Cloud Scheduler)
```bash
gcloud scheduler jobs create http skillradar-hourly-scraper \
  --location us-central1 \
  --schedule "0 * * * *" \
  --uri "https://<YOUR-CLOUD-RUN-URL>/api/v1/admin/ingest" \
  --http-method POST \
  --headers "X-Admin-Token=skillradar-secret-admin-token-2026,Content-Type=application/json" \
  --message-body '{"source": "all"}'
```

---

### 4. Frontend Setup (Expo Web & Mobile)

```bash
cd mobile

# Install dependencies
npm install --legacy-peer-deps

# Run mobile smoke tests & type checks
npm test

# Start Expo Web dev server
npx expo start --web
```

#### Production Web Deploy (Vercel)
- **Root Directory**: `mobile`
- **Build Command**: `npx expo export -p web`
- **Output Directory**: `dist`
- **Environment Variable**: `EXPO_PUBLIC_API_URL=https://<YOUR-CLOUD-RUN-URL>`

---

## 🧪 Automated Test Verification

### Backend Pytest Suite (22 Tests Passing)
```bash
cd backend
python -m pytest tests -v
```
**Test Matrix Coverage:**
- **T4.6:** Idempotent source deduplication (zero duplicate rows on re-fetch).
- **T4.7:** Source failure / timeout isolation (single source failure never crashes batch).
- **T4.8:** Gemini offline / invalid JSON resilience (graceful heuristic fallback).
- **T4.9:** Independent corroboration rule (distinct domain check for `Emerging` label).
- **T4.10:** Missing publication date preservation (never fabricated).
- **T4.11:** Suggestions served strictly on-request from database.
- **T4.12:** Accepting suggestion inserts at prerequisite-correct position with `source = 'suggested'`.
- **T4.13:** Roadmap status toggle (`todo` $\to$ `in_progress` $\to$ `done`) persistence.
- **T4.14:** Cross-user isolation (User A cannot access User B data; HTTP 403).
- **T4.15:** Content gating (unverified videos and unapproved notes strictly withheld).
- **T4.16:** Prerequisite cycle detection (cycle DFS catches loops).
- **T4.17:** Prompt injection defense (untrusted abstracts sanitized in strict delimiters).
- **T4.18:** Authentication security (bcrypt password checks, token expiry, query params blocked).

### Mobile TypeScript & Smoke Suite (100% Passing)
```bash
cd mobile
npm test
```
- Domain catalog verification (3 launch domains)
- Prerequisite-correct topological ordering
- Status progression toggles
- Learn dossier gating & video verification
- Personal notes autosave & persistence

---

## 🛡️ Core Rules & Design Principles

1. **Jargon Buster (Key Terms Explained First):**
   - High-density technical terms (*"Autonomous Agent"*, *"Deterministic Safety"*, *"Verifiable Provenance"*, *"Idempotency"*) are explained **before** the article with simple definitions and everyday analogies.
2. **Notification-Style Chronology:**
   - Discoveries are sorted latest-first with exact timestamps (`Today at 11:08 AM`) and visual `💡 KEY IMPACT` badges.
3. **Truthfulness and Anti-Hallucination:**
   - Canonical URLs and publication dates are strictly attached by backend code, never invented by AI.
   - Initial label is always `New`; promoted to `Emerging` only when corroborated across $\ge 2$ independent source domains.
4. **Prerequisite-Aware Curriculum:**
   - Skills added to a roadmap automatically resolve prerequisites and slot in correct learning sequence.

---

## 📜 Changelog

### Version 2.0.0
- **Jargon Buster**: Prominent `🧠 KEY TERMS EXPLAINED FIRST` section explaining technical buzzwords with real-world analogies.
- **Plain-English News Breakdown**: Replaced dense academic abstracts with approachable, multi-paragraph architectural syntheses and concrete deployment vectors.
- **Notification-Style Feed**: Added exact timestamps (`Today at 11:08 AM`, `Yesterday at 4:15 PM`) and `💡 KEY IMPACT` cards.
- **Cloud Run & Neon Deployment**: Added production `Dockerfile`, `.dockerignore`, `vercel.json`, and database migration scripts for serverless PostgreSQL on Neon.
- **Automated Ingestion Worker**: Implemented non-blocking background ingestion worker via FastAPI `lifespan` handler.
- **Telemetry Stream Expansion**: Integrated Google News AI feeds, expanding coverage to 184 active verified discoveries.

### Version 1.1.0
- **Curriculum Roadmaps**: Prerequisite-aware topological skill ordering across 3 launch domains.
- **Hands-On AI Missions**: Chapter tasks with rubric evaluation criteria.
- **Video & Notes Gating**: Integrated verified YouTube embeds and reviewed study notes.
- **Offline Mock Fallback**: Added graceful mobile fallback when offline or disconnected.

### Version 1.0.0
- Initial prototype launch with arXiv feed ingestion, basic Gemini enrichment, and Expo mobile client.

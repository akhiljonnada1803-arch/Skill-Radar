# DECISIONS.md — SkillRadar AI Architectural & Product Decisions (v2)

This document records the architectural, algorithmic, and product decisions resolved prior to and during the build, addressing all open decisions from PRD §14 and Phase 0 tasks for v2 (domain-first roadmap).

---

## 1. Phase 0 Tasks & Decisions

### T0.1 — 3 Launch Domains
- **Launch Domains:**
  1. `ai-engineering` — AI Engineering (Foundational LLMs, embeddings, RAG architectures, evaluations, prompt engineering, agent orchestration).
  2. `fullstack-mobile` — Full-Stack & Mobile (TypeScript, React Native, Expo, state management, modern backend API design, offline persistence).
  3. `cloud-devops` — Cloud & DevOps (Docker containers, Linux fundamentals, CI/CD pipelines, Kubernetes primitives, observability, infrastructure as code).
- **Rationale:** These three domains represent the most demanded modern tech trajectories for university and bootcamp graduates, and each offers distinct, verifiable learning pathways.

### T0.2 — Curated Skills & Prerequisites (~8 per domain)
- **AI Engineering:**
  1. `python-for-ai` (prerequisites: none)
  2. `llm-foundations` (prerequisites: `python-for-ai`)
  3. `prompt-engineering` (prerequisites: `llm-foundations`)
  4. `embeddings-vector-dbs` (prerequisites: `python-for-ai`)
  5. `rag-basics` (prerequisites: `llm-foundations`, `embeddings-vector-dbs`)
  6. `fine-tuning-peft` (prerequisites: `llm-foundations`)
  7. `agentic-architectures` (prerequisites: `rag-basics`)
  8. `evals-and-guardrails` (prerequisites: `agentic-architectures`)
- **Full-Stack & Mobile:**
  1. `modern-javascript` (prerequisites: none)
  2. `typescript-core` (prerequisites: `modern-javascript`)
  3. `react-fundamentals` (prerequisites: `typescript-core`)
  4. `expo-react-native` (prerequisites: `react-fundamentals`)
  5. `state-management-tanstack` (prerequisites: `react-fundamentals`)
  6. `rest-api-design` (prerequisites: `typescript-core`)
  7. `offline-first-sync` (prerequisites: `expo-react-native`, `state-management-tanstack`)
  8. `mobile-security-auth` (prerequisites: `rest-api-design`, `expo-react-native`)
- **Cloud & DevOps:**
  1. `linux-shell-scripting` (prerequisites: none)
  2. `git-and-github` (prerequisites: none)
  3. `docker-containers` (prerequisites: `linux-shell-scripting`)
  4. `ci-cd-github-actions` (prerequisites: `git-and-github`, `docker-containers`)
  5. `cloud-compute-networking` (prerequisites: `linux-shell-scripting`)
  6. `kubernetes-fundamentals` (prerequisites: `docker-containers`, `cloud-compute-networking`)
  7. `terraform-iac` (prerequisites: `cloud-compute-networking`)
  8. `observability-monitoring` (prerequisites: `docker-containers`)

### T0.3 — arXiv Categories
- **Decision:** Use `cs.AI` (Artificial Intelligence), `cs.LG` (Machine Learning), and `cs.CL` (Computation and Language).
- **Query Pattern:** `search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending`

### T0.4 — Model-Release Feed
- **Decision:** Google AI Research Blog RSS (`https://blog.google/technology/ai/rss/`) as the primary release feed, supplemented by Hugging Face Blog RSS (`https://huggingface.co/blog/feed.xml`).
- **Terms:** Public RSS syndicate meant for news dissemination. Normalised title, permalink, published date, and content summary are extracted cleanly.

### T0.5 — Auth Approach
- **Decision:** Real user accounts via email + password with secure bcrypt hashing (rounds=12).
- **Session:** Bearer JSON Web Tokens (JWT) signed with HMAC-SHA256. Expiry: 7 days.
- **Security Rule:** User identity is extracted solely from the validated `Authorization: Bearer <token>` header. Query string user IDs (`?user_id=...`) and user IDs passed in JSON request bodies are explicitly forbidden and rejected.

### T0.6 — Demo Hosting
- **Decision:** Local network backend:
  - Android Emulator: `http://10.0.2.2:8000`
  - Physical Device / Expo Go: `http://<LAN_IP>:8000` (configurable via `EXPO_PUBLIC_API_URL` environment variable)
  - Default development fallback: `http://localhost:8000`

### T0.7 — Suggestion & Evidence Rules
- **Eligibility Window:** Discoveries published within the last 90 days.
- **Minimum Enrichment Quality:** Requires non-empty summary, category, at least one practical application, and at least one mapped skill.
- **Labels:**
  - `PAPER`: Ingested from arXiv.
  - `RELEASE`: Ingested from model-release feeds (Google AI, Hugging Face).
- **Evidence Rule:**
  - **Default:** Every new discovery is labelled **`NEW`**.
  - **`EMERGING`** is applied ONLY if:
    1. Corroborated by $\ge 2$ independent sources (distinct domain/publisher), OR
    2. Attributable official major release from a verified organization with benchmark/release evidence.
- **Ranking Score Formula:**
  $$\text{Score} = 0.40 \times S_{\text{domain}} + 0.30 \times S_{\text{overlap}} + 0.15 \times S_{\text{recency}} + 0.15 \times S_{\text{evidence}}$$
  Where $S_{\text{domain}}$ is domain match (1.0 if discovery matches roadmap domain), $S_{\text{overlap}}$ is overlap with student's current skills or roadmap targets, $S_{\text{recency}}$ is decay over 90 days, and $S_{\text{evidence}}$ is 1.0 for EMERGING and 0.5 for NEW.
  Every suggestion produces a short deterministic `score_reason` (e.g. *"Extends RAG Basics with newly published multi-modal retrieval benchmarks"*).

### T0.8 — Video Playback
- **Decision:** Direct link-out / official YouTube player URL (`https://www.youtube.com/watch?v={id}`).
- **Strict Guardrail:** No scraping, downloading, caching, or re-hosting of videos. Every video must be verified by the human curator (`verified: true`). The loader refuses any video marked `verified: false`.

### T0.9 — Content Curator
- **Named Curator:** Alex Rivera (Lead Curriculum Curator, SkillRadar AI Project).
- **Responsibilities:** Verifying each YouTube video URL, writing concise outlines/overviews/mini-projects, and approving AI-generated study notes before they are exposed to the API.

### T0.10 — Frozen API Contract
- The API is versioned at `/api/v1` and documented in `docs/API_CONTRACT.md`. Both backend Pydantic schemas and mobile TypeScript types strictly match this contract.

---

## 2. Suggestion Acceptance Rule
When a user accepts a suggestion from `GET /roadmaps/{id}/suggestions`:
1. The skill is inserted into the user's roadmap with `source = 'suggested'` and `added_from_discovery_id = <discovery_id>`.
2. The skill is placed at a prerequisite-correct position (after any prerequisites). If it has no prerequisites in the curated tree, it is added at the end of the current section.
3. Unmatched skills from discoveries are added standalone with **no invented prerequisites**.
4. The suggestion state is updated to `accepted` in `user_discovery_state`.

---

## 3. Data Integrity & Safety Guardrails
1. **Never Hallucinate:** URLs, source IDs, published dates, and video IDs are attached exclusively by the backend code or curator content files. Gemini is strictly prohibited from generating external IDs or video links.
2. **Untrusted Data Delimitation:** All ingested abstracts and titles are passed inside `<source_content>...</source_content>` tags with explicit prompt instructions to treat content strictly as untrusted data.
3. **Live vs Seeded Separation:** The `is_seeded` boolean is returned on all discovery and suggestion payloads. Seeded records display the `[DEMO DATA]` badge; live records display `[LIVE SOURCE]`.
4. **Verified / Approved Gates:** Unverified videos (`verified = false`) and unapproved notes (`status != 'approved'`) are filtered out server-side and never returned by the API.

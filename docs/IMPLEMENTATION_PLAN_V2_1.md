# SkillRadar AI — Implementation Plan v2.1.0

> **Scope:** Post-lifecycle-review improvements. All P0 items must ship before P1 work begins.
> No new infrastructure is added without a clear documented need.
> Task IDs use the prefix `T5.` (continuing from the v2.0.0 task series).

---

## Priority Ladder

| Band | Meaning |
|------|---------|
| **P0** | Fix immediately — live reliability or data-trust risk |
| **P1** | Next release (v2.1.0) — user-facing quality improvements |
| **P2** | Future release — performance and polish when P1 is stable |

---

## P0 — Fix Immediately

### T5.1 — Switch Cloud Run to Neon Pooler URL

| Field | Detail |
|-------|--------|
| **Problem** | Cloud Run env var `DATABASE_URL` points at the direct Neon host. Each cold-start opens a fresh long-lived connection. Under concurrent load or frequent cold-starts, connections exhaust the Neon free-tier limit and the app returns 500 errors. |
| **Proposed Improvement** | In the Cloud Run service console, update the `DATABASE_URL` environment variable to use the **pooled** Neon connection string (ends in `-pooler.c-6.us-east-2.aws.neon.tech`). No code change is required. |
| **Dependencies** | Active Cloud Run service deployment. Neon pooler endpoint already provisioned. |
| **Risks** | Pooled connections use PgBouncer's transaction-mode; `SET LOCAL` / advisory-lock patterns fail. Audit for any usage before switching. |
| **Testing Required** | 1. Run `python -m pytest backend/tests` — all 22 tests pass. 2. Hit `/api/v1/discoveries` under 10 concurrent requests; confirm no connection errors in Cloud Run logs. |
| **Expected Outcome** | Zero connection-exhaustion errors under normal concurrent load. |

---

### T5.2 — Add Open-Access vs Paywall Tagging

| Field | Detail |
|-------|--------|
| **Problem** | Students tap a source link expecting free access. Paywalled articles (Nature, IEEE, ACM) produce a dead end with no warning, eroding trust. |
| **Proposed Improvement** | Add `open_access: bool` column (default `True`) to the `discoveries` table via Alembic migration. Populate it in the ingestion runner by checking the canonical URL against a static known-paywall domain list. Expose the field in `DiscoveryCard` and `DiscoveryDetail` schemas. Display a 🔒 badge next to the source link in the mobile feed and dossier when `open_access = False`. |
| **Dependencies** | T5.1 (stable DB connection). Alembic migration must run before backend deploy. |
| **Risks** | Domain list is a heuristic; edge cases will be mis-tagged. Label as "best effort" in docs. Do not block ingestion if domain check fails — default to `True`. |
| **Testing Required** | 1. Migration applies cleanly (`alembic upgrade head`). 2. At least one seeded discovery correctly tagged `open_access = False`. 3. 🔒 badge visible in feed and dossier. 4. All 22 backend tests still pass. |
| **Expected Outcome** | Students see clear paywall warnings before tapping; trust in source links improves. |

---

### T5.3 — Offline Cache for Discovery Feed

| Field | Detail |
|-------|--------|
| **Problem** | If the backend is unreachable (Cloud Run cold-start, network drop, quota exhaustion), the Discover tab shows a blank error screen. Students cannot access any previously loaded content. |
| **Proposed Improvement** | Add `@tanstack/query-async-storage-persister` + `expo-secure-store` (or `@react-native-async-storage/async-storage`) to the mobile project. Configure React Query's `persistQueryClient` to persist the `discoveries` query cache to device storage with a 24-hour max-age. On app launch the stale cache is shown immediately; a background refetch replaces it if the network is available. Add a visible "Offline — showing cached results" banner when the device has no connectivity. |
| **Dependencies** | `expo-secure-store` or `async-storage` package install. Existing React Query `QueryClient` in `mobile/`. |
| **Risks** | Cached data can be up to 24 hours old. Make the staleness timestamp visible to the user. Secure store has a 2 KB per-entry limit on iOS — use `async-storage` for the cache blob. |
| **Testing Required** | 1. Load feed. 2. Enable Airplane mode. 3. Kill and reopen app — cached feed must appear. 4. Offline banner must be shown. 5. Reconnect — banner disappears and feed refreshes. 6. Mobile smoke tests (`npm test`) still pass. |
| **Expected Outcome** | App remains usable without network; students are never blocked by transient backend outages. |

---

## P1 — Build in Next Release (v2.1.0)

### T5.4 — Collapsible Accordion for Jargon Buster

| Field | Detail |
|-------|--------|
| **Problem** | On articles with 4–6 key terms the Jargon Buster card occupies the entire initial viewport, pushing the article summary and evidence ledger below the fold. Users who already know the terms cannot collapse the card. |
| **Proposed Improvement** | In `mobile/app/discovery/[id].tsx`, wrap the `jargonSectionCard` list in a collapsible component. Default state: **expanded** on first visit to a dossier, **collapsed** on subsequent visits (persist preference per discovery ID in AsyncStorage). Add a chevron toggle button labelled "🧠 Key Terms (tap to expand/collapse)". |
| **Dependencies** | T5.3 (AsyncStorage already installed). No backend change. |
| **Risks** | Collapsed by default would hide useful content from first-time users — keep expanded as default. |
| **Testing Required** | 1. Open a dossier with ≥3 key terms — card is expanded. 2. Collapse — content hides, chevron flips. 3. Scroll to summary — it is now in the first viewport. 4. Revisit same dossier — card is collapsed. 5. Different dossier — card is expanded (per-discovery preference). |
| **Expected Outcome** | Power users skip past known terms; article content is accessible immediately without scrolling. |

---

### T5.5 — Search and Category Filter on Discover Tab

| Field | Detail |
|-------|--------|
| **Problem** | The feed has 184 discoveries. There is no way to find a specific topic ("deterministic safety", "edge AI") or filter by domain without scrolling the full list. |
| **Proposed Improvement** | **Backend:** add optional query parameters `q` (text search, case-insensitive `ILIKE` on `title` and `summary`) and `category` (exact enum match) to `GET /api/v1/discoveries`. Apply T5.8 index first. **Mobile:** add a search bar (`TextInput`) and a horizontal chip row of category filters above the feed list in `index.tsx`. Debounce text input by 400 ms before firing the query. Use the existing React Query keys — add `q` and `category` to the key array so results cache per-query. |
| **Dependencies** | T5.8 (Postgres index on discoveries for performance). Backend router change. |
| **Risks** | ILIKE on large tables without an index is slow — **do not ship the UI without T5.8**. Empty search results must show a friendly empty state, not an error. |
| **Testing Required** | 1. Search "agent" — results contain only discoveries with "agent" in title or summary. 2. Select "AI Agents" chip — results filtered to that category. 3. Combined: search + category chip. 4. Clear search — full feed restored. 5. Backend: add one pytest case for `GET /api/v1/discoveries?q=agent`. |
| **Expected Outcome** | Students find specific topics in under 5 seconds; domain filter reduces cognitive load on the feed. |

---

### T5.6 — Shareable Roadmap Dossier URL

| Field | Detail |
|-------|--------|
| **Problem** | Students cannot share their learning roadmap with peers, mentors, or potential employers. Every roadmap is private and session-bound. |
| **Proposed Improvement** | Add `GET /api/v1/roadmaps/{roadmap_id}/share` — a **public, read-only** endpoint. On first call it generates a short `share_token` (UUID-based, stored on the `roadmaps` row). Subsequent calls return the same token. The shareable URL format: `https://<app-domain>/roadmap/share/{share_token}`. Mobile: add a Share button (Ionicons `share-outline`) on the roadmap screen that calls this endpoint and uses the native share sheet (`expo-sharing` or `Share.share()`). Add a `GET /api/v1/roadmaps/view/{share_token}` public endpoint that returns the read-only roadmap payload (no auth required, no PII other than display name). |
| **Dependencies** | Roadmap model and router already exist. `expo-sharing` or React Native `Share` API (built-in, no extra package). |
| **Risks** | Shared roadmap is public once generated. Add a "Revoke share link" button that clears `share_token`. Do not expose email, internal user ID, or any PII in the public payload. |
| **Testing Required** | 1. Hit share endpoint — token returned, 2nd call returns same token. 2. Public view endpoint — accessible without auth header. 3. Revoke — view endpoint returns 404. 4. Verify no PII fields (`email`, `user_id`) in public payload. 5. Existing auth-protected roadmap endpoints unchanged. |
| **Expected Outcome** | Students share roadmap links externally; roadmap remains read-only and no PII is leaked. |

---

### T5.7 — Save vs Add-to-Roadmap Tooltip Clarification

| Field | Detail |
|-------|--------|
| **Problem** | Two actions appear in the dossier: "Save" (bookmark for later) and "+ Add to Roadmap" (enroll in curriculum). User research shows ~40% of students believe they are the same action; they tap one expecting the other's behaviour. |
| **Proposed Improvement** | On the **first time** a user interacts with either button, show a one-shot tooltip (React Native `Modal` or inline callout, not a full screen). "💾 Save = Read Later — keeps this article in your saved list." / "🗺 Add to Roadmap = Study This — adds skills to your learning curriculum with prerequisites." Persist the "tooltip seen" flag per button in AsyncStorage so it only shows once. No backend change. |
| **Dependencies** | T5.3 (AsyncStorage). No backend change. |
| **Risks** | Modal tooltips can feel intrusive — use a lightweight inline callout (e.g., a bubble below the button) rather than a blocking modal. |
| **Testing Required** | 1. Fresh install / cleared storage — tooltip appears on first tap of each button. 2. Dismiss — does not reappear on the same screen or subsequent visits. 3. Both tooltips independent (seeing Save tooltip does not suppress Roadmap tooltip). |
| **Expected Outcome** | Confusion between Save and Roadmap drops; roadmap enrollment rate improves. |

---

## P2 — Future Release (after v2.1.0 is stable)

### T5.8 — Postgres Index on Discoveries Table

| Field | Detail |
|-------|--------|
| **Problem** | `GET /api/v1/discoveries?q=` runs a full-table ILIKE scan on the `discoveries` table. At 184 rows this is unnoticeable; at 1 000+ rows it degrades to multiple-second response times. |
| **Proposed Improvement** | Add an Alembic migration that creates: (1) `GIN` index on `to_tsvector('english', title \|\| ' ' \|\| summary)` for full-text search, or (2) a simple B-tree index on `category` for filter queries. Apply **before** T5.5 goes live. |
| **Dependencies** | Alembic setup. Must apply before T5.5 is deployed. |
| **Risks** | `GIN` indexes take more storage and slightly slow writes. Acceptable at this scale. |
| **Testing Required** | 1. `EXPLAIN ANALYZE` on `?q=agent` shows index scan, not seq scan. 2. All 22 backend tests pass post-migration. |
| **Expected Outcome** | Search responds in under 200 ms at 10 000-row scale. |

---

### T5.9 — File Upload Confirmation Badge in Mission Submission

| Field | Detail |
|-------|--------|
| **Problem** | When a student submits a file for a hands-on mission, the UI returns to the chapter screen with no visible confirmation that the upload succeeded. Students re-submit, causing duplicate entries. |
| **Proposed Improvement** | After a successful mission file upload API call, show an inline confirmation badge ("✅ Submitted — [filename] · [timestamp]") within the chapter card. Persist the badge state in the mission submission record (already in DB). On reload, re-read the submission status and show the badge if a prior submission exists. |
| **Dependencies** | Mission submission endpoint and model already exist. No new API needed. |
| **Risks** | If the upload succeeds server-side but the response is lost (network drop), the badge won't appear — add a `GET /submissions/{mission_id}` check on chapter screen mount. |
| **Testing Required** | 1. Submit a file — badge appears immediately. 2. Navigate away and return — badge still shown (persisted). 3. Submit again — confirm no duplicate DB record. 4. Simulate network drop after upload — on reopen, badge appears after status check. |
| **Expected Outcome** | Duplicate submissions drop to zero; students have clear proof of task completion. |

---

## Delivery Order

```
P0: T5.1 → T5.2 → T5.3   (ops + data trust + resilience)
         ↓
P1: T5.7 → T5.4 → T5.8 → T5.5 → T5.6   (UX polish, then search, then share)
         ↓
P2: T5.9   (submission quality when P1 is stable)
```

> T5.8 is listed P2 but **must deploy before T5.5 UI goes live**.
> T5.7 has no backend dependency — it can be developed in parallel with T5.4.

---

## Testing Checklist (v2.1.0 Release Gate)

- [ ] All 22 backend pytest tests pass (`python -m pytest backend/tests`)
- [ ] Mobile smoke tests pass (`cd mobile; npm test`)
- [ ] Offline mode: feed loads from cache when network is unavailable
- [ ] 🔒 badge visible for at least one known-paywall discovery
- [ ] Jargon Buster accordion expands/collapses; per-discovery preference persists
- [ ] Search returns relevant results; empty query returns full feed
- [ ] Category filter works standalone and combined with search
- [ ] Share link is publicly accessible without auth; no PII in payload
- [ ] Revoke share — link returns 404
- [ ] Tooltip appears once per button on first interaction; does not reappear
- [ ] No credentials, API keys, or secrets appear in any committed file
- [ ] Cloud Run logs show zero connection-exhaustion errors under 10 concurrent requests

---

## Post-Release Monitoring Plan

| Signal | Tool / Method | Alert threshold |
|--------|--------------|-----------------|
| Connection errors | Cloud Run logs → filter `asyncpg` or `psycopg` errors | > 5 errors / hour |
| Feed load time | Cloud Run request latency p95 | > 2 s |
| Search usage | Log `q` param presence in discovery requests | Baseline after 2 weeks |
| Offline cache hits | Client-side log event when stale cache served | Track ratio |
| Share link creation | Count `share_token` non-null rows weekly | Growth trend |
| Duplicate submissions | DB query: `COUNT(*) GROUP BY mission_id, user_id HAVING COUNT > 1` | Any duplicate = investigate |
| Paywall mis-tags | Manual spot-check 10 random `open_access=False` rows weekly | Any wrong tag = domain list fix |
| Test suite health | CI run on every push | Any failure = block merge |

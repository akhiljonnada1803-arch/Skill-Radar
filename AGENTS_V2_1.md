# AGENTS_V2_1.md — SkillRadar AI v2.1.0

Instructions for AI coding agents executing the v2.1.0 implementation tasks.

> This file extends `AGENTS.md` (v1/v2.0.0 rules). **All rules in `AGENTS.md` remain in force.**
> This file adds v2.1.0-specific task specs, constraints, and agent ownership.
> Task IDs use the `T5.` prefix (continuing from the T4.x series in `AGENTS.md`).
> Cross-reference: `docs/IMPLEMENTATION_PLAN_V2_1.md` for the full rationale and delivery order.

---

## 1. v2.1.0 Task Registry

| Task ID | Priority | Title | Owner Role |
|---------|----------|-------|------------|
| T5.1 | P0 | Switch Cloud Run to Neon Pooler URL | Ops / Backend Agent |
| T5.2 | P0 | Open-Access vs Paywall tagging | Backend Agent |
| T5.3 | P0 | Offline cache for Discovery feed | Mobile Agent |
| T5.4 | P1 | Jargon Buster collapsible accordion | Mobile Agent |
| T5.5 | P1 | Search + category filter on Discover tab | Backend Agent + Mobile Agent |
| T5.6 | P1 | Shareable roadmap dossier URL | Backend Agent + Mobile Agent |
| T5.7 | P1 | Save vs Roadmap tooltip clarification | Mobile Agent |
| T5.8 | P2* | Postgres index on discoveries | Backend Agent |
| T5.9 | P2 | File upload confirmation badge | Mobile Agent + Backend Agent |

> *T5.8 is P2 in the backlog but **must be deployed before T5.5 UI goes live**.

---

## 2. Delivery Order Rule

Agents **must not start a task** until all tasks it depends on are merged and deployed.

```
P0: T5.1 → T5.2 → T5.3
         ↓
P1: T5.7 and T5.4 (parallel) → T5.8 → T5.5 → T5.6
         ↓
P2: T5.9
```

---

## 3. Non-negotiable rules for v2.1.0

These extend — never override — the rules in `AGENTS.md §5`.

### Secrets and credentials
30. **Never commit a database URL, API key, or token** to any file in the repository. Cloud Run env vars are set in the Google Cloud Console only. Reference them in code as `settings.DATABASE_URL` from `backend/app/core/config.py`. If you find a credential in code, remove it and report it.

### Alembic migrations (T5.2, T5.8)
31. Every schema change must have an Alembic migration. Migration files go in `backend/alembic/versions/`. Name them `YYYYMMDD_T5x_<short_description>.py`.
32. Migrations must be **reversible** (implement `downgrade()`).
33. Run `alembic upgrade head` locally and confirm it applies cleanly before committing.
34. **Do not edit existing migration files.** Add new ones only.

### Mobile packages (T5.3, T5.4, T5.7)
35. Add new Expo/npm packages only when no existing package covers the need. Check `mobile/package.json` first.
36. Use `@react-native-async-storage/async-storage` for the offline cache and tooltip/accordion preference flags — **not** `expo-secure-store` (2 KB limit on iOS would be exceeded by a full feed cache).
37. Run `cd mobile; npm test` after any change to `mobile/`. All smoke tests must pass before committing.

### API contract (T5.5, T5.6)
38. New query parameters (`q`, `category`) are **optional** — omitting them must return the same response as the current unfiltered endpoint. Do not break existing callers.
39. The public share endpoint (`GET /api/v1/roadmaps/view/{share_token}`) must **never** return `email`, `password_hash`, or any field from the `users` table. Whitelist the response fields in a dedicated Pydantic schema.
40. Document any new endpoint in the docstring of its router function. Do not add endpoints without a docstring.

### Search (T5.5, T5.8)
41. **Do not deploy the search UI (T5.5) before the Postgres index (T5.8) is applied.** Confirm the migration is live on Neon before merging the mobile PR.
42. ILIKE queries use the pattern `%{term}%`. Sanitise the input — strip leading/trailing whitespace, limit to 100 characters.
43. Empty-string `q` is treated as "no filter" — return the full feed, not an empty result.

### Offline cache (T5.3)
44. The cache max-age is **24 hours**. Display the cache timestamp to the user ("Last updated: Today at 11:08 AM").
45. The "Offline — showing cached results" banner is **required** when `NetInfo.isConnected === false`. It must not appear when the device is online.
46. The cache must **not** store auth tokens or user-specific data beyond what is already in the discovery payload.

### Shareable roadmap (T5.6)
47. `share_token` is a UUID4 generated server-side. Never accept a client-supplied token.
48. The "Revoke" action sets `share_token = NULL` in the DB. After revocation, `GET /roadmaps/view/{old_token}` returns HTTP 404.
49. The share URL uses the production `EXPO_PUBLIC_API_URL` base — do not hardcode a domain.

### Tooltip (T5.7)
50. Tooltip "seen" flags are stored in AsyncStorage with keys `tooltip_seen_save` and `tooltip_seen_roadmap`. These are boolean flags, not timestamps.
51. Use a lightweight **inline callout** (e.g., an absolutely-positioned bubble component), not a `Modal`. Modals block the UI and feel heavy for a one-line hint.

---

## 4. Agent Roles for v2.1.0

### Backend Agent (v2.1.0)
- **Owns:** migrations, `backend/app/api/routes/discoveries.py`, `backend/app/api/routes/roadmaps.py`, `backend/app/schemas/`, `backend/app/models/`.
- **Tasks:** T5.1 (ops), T5.2, T5.5 (backend half), T5.6 (backend half), T5.8.
- **Must not:** modify mobile code; commit env var values; merge T5.5 router before T5.8 index is confirmed live.

### Mobile Agent (v2.1.0)
- **Owns:** everything under `mobile/`.
- **Tasks:** T5.3, T5.4, T5.5 (mobile half), T5.6 (mobile half), T5.7, T5.9 (mobile badge).
- **Must not:** call Gemini directly; store secrets; ship T5.5 search UI before T5.8 is deployed.

### QA & Docs Agent (v2.1.0)
- **Owns:** `backend/tests/`, `docs/`, `README.md`.
- **Tasks:** verify acceptance checks for each T5.x task; update `docs/IMPLEMENTATION_PLAN_V2_1.md` checkboxes as tasks complete.
- **Must not:** mark a test passed without running it; edit production code.

---

## 5. Commit Message Convention

Follow the existing pattern: `T5.x: <imperative verb> <what changed>`

Examples:
```
T5.2: add open_access column and paywall domain heuristic
T5.3: add AsyncStorage offline persistence to discovery feed
T5.5: add q and category filter params to GET /discoveries
T5.8: add GIN index on discoveries title+summary for full-text search
```

One commit per task ID. Do not bundle multiple task IDs in a single commit.

---

## 6. Definition of Done (v2.1.0, per task)

A task is done **only when all of the following are true:**

- [ ] Code change is committed with the correct `T5.x:` prefix message.
- [ ] All 22 backend pytest tests pass (`python -m pytest backend/tests`).
- [ ] Mobile smoke tests pass (`cd mobile; npm test`).
- [ ] The specific acceptance checks listed in `docs/IMPLEMENTATION_PLAN_V2_1.md` for that task are satisfied and documented.
- [ ] No secrets, credentials, or database URLs appear in any changed file.
- [ ] Failure paths are tested (network drop, bad input, empty result, missing record).
- [ ] The `docs/IMPLEMENTATION_PLAN_V2_1.md` task checklist item is ticked.

---

## 7. Out of Scope for v2.1.0

Do not build these unless explicitly added to the backlog:

- Push notifications.
- Social or gamification features.
- Vector search / RAG / embeddings.
- ML-based ranking.
- Multi-agent orchestration.
- App Store / Play Store publication.
- Real-time websocket feed updates.
- A/B testing infrastructure.

If a task seems to require one of the above, stop and flag it rather than implementing it.

---

## 8. Quality Targets to Protect (v2.1.0 additions)

These add to — not replace — the targets in `AGENTS.md §10`.

- Offline cache serves last-known feed within **500 ms** of app open on a device with no network.
- Search results for a single-word query return in under **200 ms** (with T5.8 index applied).
- Share link round-trip (generate token → open public URL) completes in under **1 s**.
- No PII in any public API response (verified by automated test in T5.6 acceptance check).
- Zero new `asyncpg` connection-exhaustion errors in Cloud Run logs after T5.1 is applied.

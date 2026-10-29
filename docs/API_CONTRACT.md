# API Contract — SkillRadar AI (v2 Frozen)

Base URL: `/api/v1`

---

## 1. Authentication & Security
- **Header:** `Authorization: Bearer <jwt_token>`
- Identity is resolved server-side solely from the validated JWT token.
- Query parameter user IDs (`?user_id=...`) and payload user IDs are strictly rejected with HTTP 400/403.
- Rate limiting: Login attempts are rate-limited (5 attempts per minute per IP/account).

---

## 2. Endpoints

### 2.1 Health Check
- `GET /health`
  - Response `200 OK`:
    ```json
    {
      "status": "ok",
      "version": "2.0.0",
      "database": "connected"
    }
    ```

### 2.2 Authentication
- `POST /auth/register`
  - Request:
    ```json
    {
      "email": "student@example.edu",
      "password": "SecurePassword123!"
    }
    ```
  - Response `201 Created`:
    ```json
    {
      "access_token": "eyJhbGciOi...",
      "token_type": "bearer",
      "user": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "email": "student@example.edu"
      }
    }
    ```

- `POST /auth/login`
  - Request:
    ```json
    {
      "email": "student@example.edu",
      "password": "SecurePassword123!"
    }
    ```
  - Response `200 OK`: Same as register response.

- `GET /auth/me`
  - Headers: `Authorization: Bearer <token>`
  - Response `200 OK`:
    ```json
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "student@example.edu",
      "profile": {
        "selected_domain_id": "d001...",
        "display_name": "Student Name",
        "experience_level": "beginner",
        "weekly_study_minutes": 300
      }
    }
    ```

### 2.3 Domains
- `GET /domains`
  - Response `200 OK`:
    ```json
    [
      {
        "id": "00000000-0000-0000-0000-000000000001",
        "slug": "ai-engineering",
        "name": "AI Engineering",
        "description": "Foundational LLMs, embeddings, RAG architectures, evaluations, and agent orchestration.",
        "icon": "brain",
        "skill_count": 8
      },
      {
        "id": "00000000-0000-0000-0000-000000000002",
        "slug": "fullstack-mobile",
        "name": "Full-Stack & Mobile",
        "description": "TypeScript, React Native, Expo, state management, REST APIs, and offline sync.",
        "icon": "smartphone",
        "skill_count": 8
      },
      {
        "id": "00000000-0000-0000-0000-000000000003",
        "slug": "cloud-devops",
        "name": "Cloud & DevOps",
        "description": "Linux, Docker containers, CI/CD, cloud architecture, and Kubernetes.",
        "icon": "cloud",
        "skill_count": 8
      }
    ]
    ```

### 2.4 User Profile
- `GET /profile`
  - Response `200 OK`:
    ```json
    {
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "display_name": "Student",
      "selected_domain_id": "00000000-0000-0000-0000-000000000001",
      "selected_domain_slug": "ai-engineering",
      "experience_level": "intermediate",
      "weekly_study_minutes": 360,
      "updated_at": "2026-10-29T10:00:00Z"
    }
    ```

- `PUT /profile`
  - Request:
    ```json
    {
      "display_name": "Student",
      "selected_domain_id": "00000000-0000-0000-0000-000000000001",
      "experience_level": "intermediate",
      "weekly_study_minutes": 360
    }
    ```
  - Response `200 OK`: Updated profile.

### 2.5 Roadmaps & Suggestions
- `GET /roadmaps/current`
  - Response `200 OK`:
    ```json
    {
      "id": "roadmap-uuid",
      "domain_id": "00000000-0000-0000-0000-000000000001",
      "domain_name": "AI Engineering",
      "title": "AI Engineering Roadmap",
      "total_skills": 8,
      "completed_skills": 2,
      "items": [
        {
          "id": "item-uuid-1",
          "skill_id": "skill-uuid-1",
          "slug": "python-for-ai",
          "name": "Python for AI",
          "difficulty": "beginner",
          "status": "done",
          "position": 0,
          "source": "curated",
          "added_from_discovery_id": null,
          "prerequisites": []
        },
        {
          "id": "item-uuid-2",
          "skill_id": "skill-uuid-2",
          "slug": "llm-foundations",
          "name": "LLM Foundations",
          "difficulty": "beginner",
          "status": "in_progress",
          "position": 1,
          "source": "curated",
          "added_from_discovery_id": null,
          "prerequisites": ["python-for-ai"]
        }
      ]
    }
    ```

- `POST /roadmaps`
  - Request:
    ```json
    {
      "domain_id": "00000000-0000-0000-0000-000000000001"
    }
    ```
  - Response `201 Created`: Active roadmap populated with prerequisite-ordered curated skills.

- `PATCH /roadmaps/items/{item_id}`
  - Request:
    ```json
    {
      "status": "done",
      "position": 1
    }
    ```
  - Response `200 OK`: Updated roadmap item.

- `DELETE /roadmaps/items/{item_id}`
  - Response `204 No Content`.

- `GET /roadmaps/{id}/suggestions`
  - **Notice:** On request only. Reads pre-enriched stored discoveries. No Gemini calls or live network fetches during request.
  - Response `200 OK`:
    ```json
    {
      "total": 5,
      "suggestions": [
        {
          "discovery_id": "disc-uuid-1",
          "skill_slug": "reasoning-distillation",
          "skill_name": "Reasoning Model Distillation",
          "title": "Distilling Complex Multi-Step Reasoning Chains into Compact Models",
          "summary": "Demonstrates technique to transfer reasoning traces from large models into small open models with 92% retention of benchmark accuracy.",
          "source_type": "PAPER",
          "evidence_level": "EMERGING",
          "score": 0.88,
          "score_reason": "Builds on LLM Foundations; verified benchmark replication across 3 independent teams.",
          "published_at": "2026-10-24T00:00:00Z",
          "is_seeded": false,
          "source_links": [
            {
              "title": "arXiv:2410.98765",
              "url": "https://arxiv.org/abs/2410.98765"
            }
          ]
        }
      ]
    }
    ```

- `POST /roadmaps/{id}/suggestions/{disc_id}/accept`
  - Response `200 OK`: Inserts the skill at a prerequisite-correct position with `source = 'suggested'`, returning the created item.

- `POST /roadmaps/{id}/suggestions/{disc_id}/dismiss`
  - Response `200 OK`: Marks the suggestion dismissed in `user_discovery_state`.

### 2.6 Skill Learn Experience & Personal Notes
- `GET /skills/{id}/learn`
  - Response `200 OK`:
    ```json
    {
      "skill_id": "skill-uuid-1",
      "slug": "rag-basics",
      "name": "RAG Basics",
      "difficulty": "intermediate",
      "prerequisites": ["llm-foundations", "embeddings-vector-dbs"],
      "overview": "Retrieval-Augmented Generation connects LLMs to external dynamic knowledge stores.",
      "mini_project": "Build an in-memory document QA pipeline with chunking, cosine similarity, and prompt injection mitigation.",
      "videos": [
        {
          "id": "video-uuid-1",
          "youtube_id": "tcqE5442fAA",
          "title": "Retrieval Augmented Generation (RAG) Explained",
          "channel": "IBM Technology",
          "verified": true,
          "verified_on": "2026-10-25"
        }
      ],
      "study_notes": {
        "id": "note-uuid-1",
        "content_md": "# RAG Architecture\n\n1. Indexing: Documents are chunked and converted to embeddings...",
        "origin": "ai_generated",
        "status": "approved",
        "label": "AI-generated study notes, reviewed"
      },
      "is_curated": true
    }
    ```
  - **Gates:** Only videos with `verified = true` and notes with `status = 'approved'` are ever returned. For uncurated suggested skills, `videos` is empty (UI displays "No verified video yet") and `overview` is populated from the verified source abstract.

- `GET /skills/{id}/notes/me`
  - Response `200 OK`:
    ```json
    {
      "skill_id": "skill-uuid-1",
      "content": "My personal learning notes on chunking strategies...",
      "updated_at": "2026-10-29T11:00:00Z"
    }
    ```

- `PUT /skills/{id}/notes/me`
  - Request:
    ```json
    {
      "content": "Updated personal insights from building the mini-project..."
    }
    ```
  - Response `200 OK`: Updated note.

### 2.7 Ingestion (Admin Only)
- `POST /admin/ingest`
  - Headers: `X-Admin-Token: <ADMIN_TOKEN>`
  - Request: `{"source": "all"}`
  - Response `200 OK`:
    ```json
    {
      "status": "completed",
      "runs": [
        {
          "source": "arxiv",
          "status": "success",
          "items_fetched": 15,
          "items_failed": 0
        }
      ]
    }
    ```

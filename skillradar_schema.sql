-- SkillRadar AI: PostgreSQL schema (PRD v1.1, section 7)
-- Requires PostgreSQL 13+ (gen_random_uuid is built in).
-- Cycle detection for skill_prerequisites is enforced in application code.

BEGIN;

-- ---------------------------------------------------------------
-- Users and profiles
-- ---------------------------------------------------------------
CREATE TABLE users (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          TEXT UNIQUE,            -- null in single-device demo mode
    password_hash  TEXT,                   -- only if password auth is implemented
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_profiles (
    user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name          TEXT,
    experience_level      TEXT NOT NULL DEFAULT 'beginner'
        CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    career_goal           TEXT,
    interests             JSONB NOT NULL DEFAULT '[]'::jsonb,       -- ["AI agents", "Android"]
    current_skills        JSONB NOT NULL DEFAULT '[]'::jsonb,       -- skill slugs the student already knows
    weekly_study_minutes  INTEGER CHECK (weekly_study_minutes IS NULL OR weekly_study_minutes >= 0),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- Sources and ingestion
-- ---------------------------------------------------------------
CREATE TABLE sources (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL UNIQUE,
    source_type      TEXT NOT NULL
        CHECK (source_type IN ('arxiv', 'rss', 'github', 'release_feed', 'seed')),
    base_url         TEXT,
    feed_url         TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    last_fetched_at  TIMESTAMPTZ
);

CREATE TABLE ingestion_runs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id      UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at    TIMESTAMPTZ,
    status         TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'success', 'partial', 'failed')),
    items_fetched  INTEGER NOT NULL DEFAULT 0,
    items_failed   INTEGER NOT NULL DEFAULT 0,
    error_summary  TEXT
);
CREATE INDEX idx_ingestion_runs_source_started ON ingestion_runs (source_id, started_at DESC);

CREATE TABLE source_items (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id         UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    external_id       TEXT,                  -- arXiv id, RSS guid, etc.
    title             TEXT NOT NULL,
    canonical_url     TEXT NOT NULL,
    author_publisher  TEXT,
    published_at      TIMESTAMPTZ,           -- stays NULL when unknown; never invented
    fetched_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    content_text      TEXT,
    content_hash      TEXT NOT NULL,
    raw_metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_seeded         BOOLEAN NOT NULL DEFAULT FALSE,   -- demo data, must be labelled in the UI
    processing_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'enriched', 'failed')),
    processing_error  TEXT,
    -- idempotent ingestion: the same item is never stored twice
    CONSTRAINT uq_source_items_source_external UNIQUE (source_id, external_id),
    CONSTRAINT uq_source_items_url UNIQUE (canonical_url),
    CONSTRAINT uq_source_items_hash UNIQUE (content_hash)
);
CREATE INDEX idx_source_items_status ON source_items (processing_status);
CREATE INDEX idx_source_items_published ON source_items (published_at DESC NULLS LAST);

-- ---------------------------------------------------------------
-- Canonical discoveries
-- ---------------------------------------------------------------
CREATE TABLE discoveries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    summary         TEXT,
    category        TEXT,
    discovery_type  TEXT
        CHECK (discovery_type IS NULL OR discovery_type IN ('paper', 'article', 'repository', 'release', 'other')),
    applications    JSONB NOT NULL DEFAULT '[]'::jsonb,
    why_it_matters  TEXT,
    evidence_level  TEXT NOT NULL DEFAULT 'New'
        CHECK (evidence_level IN ('New', 'Emerging')),
    is_seeded       BOOLEAN NOT NULL DEFAULT FALSE,
    status          TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'enriched', 'failed', 'hidden')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_discoveries_status_created ON discoveries (status, created_at DESC);

CREATE TABLE discovery_evidence (
    discovery_id    UUID NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE,
    source_item_id  UUID NOT NULL REFERENCES source_items(id) ON DELETE CASCADE,
    evidence_role   TEXT NOT NULL DEFAULT 'primary'
        CHECK (evidence_role IN ('primary', 'corroborating', 'duplicate')),
    PRIMARY KEY (discovery_id, source_item_id)
);
CREATE INDEX idx_discovery_evidence_item ON discovery_evidence (source_item_id);

-- ---------------------------------------------------------------
-- Skills, prerequisites, resources
-- ---------------------------------------------------------------
CREATE TABLE skills (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    slug         TEXT NOT NULL UNIQUE,
    description  TEXT,
    category     TEXT,
    difficulty   TEXT NOT NULL DEFAULT 'beginner'
        CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    is_curated   BOOLEAN NOT NULL DEFAULT TRUE   -- FALSE for unmatched, standalone skills
);

CREATE TABLE skill_prerequisites (
    skill_id         UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    prerequisite_id  UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    PRIMARY KEY (skill_id, prerequisite_id),
    CHECK (skill_id <> prerequisite_id)          -- no self-edge
);
CREATE INDEX idx_skill_prereq_reverse ON skill_prerequisites (prerequisite_id);

CREATE TABLE skill_resources (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_id       UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    title          TEXT NOT NULL,
    url            TEXT NOT NULL,
    resource_type  TEXT
        CHECK (resource_type IS NULL OR resource_type IN ('video', 'article', 'course', 'docs', 'tutorial', 'project')),
    provider       TEXT,
    is_verified    BOOLEAN NOT NULL DEFAULT FALSE,
    mini_project   TEXT
);
CREATE INDEX idx_skill_resources_skill ON skill_resources (skill_id);

CREATE TABLE discovery_skills (
    discovery_id       UUID NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE,
    skill_id           UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    relevance          NUMERIC(4,3) NOT NULL DEFAULT 0.5 CHECK (relevance BETWEEN 0 AND 1),
    relationship_type  TEXT NOT NULL DEFAULT 'related'
        CHECK (relationship_type IN ('core', 'related', 'prerequisite')),
    PRIMARY KEY (discovery_id, skill_id)
);
CREATE INDEX idx_discovery_skills_skill ON discovery_skills (skill_id);

-- ---------------------------------------------------------------
-- User actions on discoveries
-- ---------------------------------------------------------------
CREATE TABLE user_discovery_state (
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discovery_id     UUID NOT NULL REFERENCES discoveries(id) ON DELETE CASCADE,
    state            TEXT NOT NULL CHECK (state IN ('saved', 'dismissed')),
    relevance_score  NUMERIC(5,2),               -- optional cached score
    score_reason     TEXT,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, discovery_id)
);
CREATE INDEX idx_user_discovery_state_user_state ON user_discovery_state (user_id, state);

-- ---------------------------------------------------------------
-- Roadmaps
-- ---------------------------------------------------------------
CREATE TABLE roadmaps (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL DEFAULT 'My Roadmap',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_roadmaps_user ON roadmaps (user_id);

CREATE TABLE roadmap_items (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roadmap_id                UUID NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
    skill_id                  UUID NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
    added_from_discovery_id   UUID REFERENCES discoveries(id) ON DELETE SET NULL,
    status                    TEXT NOT NULL DEFAULT 'todo'
        CHECK (status IN ('todo', 'in_progress', 'done')),
    position                  INTEGER NOT NULL DEFAULT 0,
    target_date               DATE,
    notes                     TEXT,
    UNIQUE (roadmap_id, skill_id)                -- one skill per roadmap
);
CREATE INDEX idx_roadmap_items_roadmap_pos ON roadmap_items (roadmap_id, position);

COMMIT;

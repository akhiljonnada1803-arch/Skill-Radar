import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Numeric, Date, DateTime, ForeignKey,
    UniqueConstraint, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

# Universal JSON type that works on both PostgreSQL (JSONB) and SQLite
JSONType = JSONB().with_variant(JSON(), "sqlite")
UUIDType = UUID(as_uuid=True).with_variant(String(36), "sqlite")

class User(Base):
    __tablename__ = "users"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=True)
    password_hash = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    roadmaps = relationship("Roadmap", back_populates="user", cascade="all, delete-orphan")
    discovery_states = relationship("UserDiscoveryState", back_populates="user", cascade="all, delete-orphan")
    user_notes = relationship("UserNote", back_populates="user", cascade="all, delete-orphan")
    task_submissions = relationship("TaskSubmission", back_populates="user", cascade="all, delete-orphan")

class Domain(Base):
    __tablename__ = "domains"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    slug = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(100), default="book", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    domain_skills = relationship("DomainSkill", back_populates="domain", cascade="all, delete-orphan", order_by="DomainSkill.position")
    roadmaps = relationship("Roadmap", back_populates="domain")

class DomainSkill(Base):
    __tablename__ = "domain_skills"

    domain_id = Column(UUIDType, ForeignKey("domains.id", ondelete="CASCADE"), primary_key=True)
    skill_id = Column(UUIDType, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    position = Column(Integer, default=0, nullable=False)

    domain = relationship("Domain", back_populates="domain_skills")
    skill = relationship("Skill")

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    user_id = Column(UUIDType, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    display_name = Column(String(255), nullable=True)
    selected_domain_id = Column(UUIDType, ForeignKey("domains.id", ondelete="SET NULL"), nullable=True)
    experience_level = Column(String(50), nullable=False, default="beginner")
    career_goal = Column(Text, nullable=True)
    interests = Column(JSONType, nullable=False, default=list)
    current_skills = Column(JSONType, nullable=False, default=list)
    weekly_study_minutes = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="profile")
    selected_domain = relationship("Domain")

    __table_args__ = (
        CheckConstraint("experience_level IN ('beginner', 'intermediate', 'advanced')", name="chk_profile_experience"),
        CheckConstraint("weekly_study_minutes IS NULL OR weekly_study_minutes >= 0", name="chk_weekly_study_minutes"),
    )

class Source(Base):
    __tablename__ = "sources"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    source_type = Column(String(50), nullable=False)
    base_url = Column(Text, nullable=True)
    feed_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_fetched_at = Column(DateTime, nullable=True)

    items = relationship("SourceItem", back_populates="source", cascade="all, delete-orphan")
    runs = relationship("IngestionRun", back_populates="source", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("source_type IN ('arxiv', 'rss', 'github', 'release_feed', 'seed')", name="chk_source_type"),
    )

class IngestionRun(Base):
    __tablename__ = "ingestion_runs"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    source_id = Column(UUIDType, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="running", nullable=False)
    items_fetched = Column(Integer, default=0, nullable=False)
    items_failed = Column(Integer, default=0, nullable=False)
    error_summary = Column(Text, nullable=True)

    source = relationship("Source", back_populates="runs")

    __table_args__ = (
        CheckConstraint("status IN ('running', 'success', 'partial', 'failed')", name="chk_run_status"),
        Index("idx_ingestion_runs_source_started", "source_id", "started_at"),
    )

class SourceItem(Base):
    __tablename__ = "source_items"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    source_id = Column(UUIDType, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    external_id = Column(String(255), nullable=True)
    title = Column(Text, nullable=False)
    canonical_url = Column(Text, nullable=False)
    author_publisher = Column(Text, nullable=True)
    published_at = Column(DateTime, nullable=True)
    fetched_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    content_text = Column(Text, nullable=True)
    content_hash = Column(String(64), nullable=False)
    raw_metadata = Column(JSONType, nullable=False, default=dict)
    is_seeded = Column(Boolean, default=False, nullable=False)
    processing_status = Column(String(50), default="pending", nullable=False)
    processing_error = Column(Text, nullable=True)

    source = relationship("Source", back_populates="items")
    evidence_links = relationship("DiscoveryEvidence", back_populates="source_item", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("source_id", "external_id", name="uq_source_items_source_external"),
        UniqueConstraint("canonical_url", name="uq_source_items_url"),
        UniqueConstraint("content_hash", name="uq_source_items_hash"),
        CheckConstraint("processing_status IN ('pending', 'enriched', 'failed')", name="chk_source_item_status"),
        Index("idx_source_items_status", "processing_status"),
        Index("idx_source_items_published", "published_at"),
    )

class Discovery(Base):
    __tablename__ = "discoveries"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    title = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    category = Column(String(255), nullable=True)
    discovery_type = Column(String(50), nullable=True) # 'paper', 'article', 'repository', 'release', 'other'
    applications = Column(JSONType, nullable=False, default=list)
    why_it_matters = Column(Text, nullable=True)
    key_terms = Column(JSONType, nullable=False, default=list)
    evidence_level = Column(String(50), default="New", nullable=False) # 'New', 'Emerging'
    is_seeded = Column(Boolean, default=False, nullable=False)
    status = Column(String(50), default="pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    evidence = relationship("DiscoveryEvidence", back_populates="discovery", cascade="all, delete-orphan")
    skills = relationship("DiscoverySkill", back_populates="discovery", cascade="all, delete-orphan")
    user_states = relationship("UserDiscoveryState", back_populates="discovery", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("evidence_level IN ('New', 'Emerging')", name="chk_discovery_evidence_level"),
        CheckConstraint("status IN ('pending', 'enriched', 'failed', 'hidden')", name="chk_discovery_status"),
        CheckConstraint("discovery_type IS NULL OR discovery_type IN ('paper', 'article', 'repository', 'release', 'other')", name="chk_discovery_type"),
        Index("idx_discoveries_status_created", "status", "created_at"),
    )

class DiscoveryEvidence(Base):
    __tablename__ = "discovery_evidence"

    discovery_id = Column(UUIDType, ForeignKey("discoveries.id", ondelete="CASCADE"), primary_key=True)
    source_item_id = Column(UUIDType, ForeignKey("source_items.id", ondelete="CASCADE"), primary_key=True)
    evidence_role = Column(String(50), default="primary", nullable=False)

    discovery = relationship("Discovery", back_populates="evidence")
    source_item = relationship("SourceItem", back_populates="evidence_links")

    __table_args__ = (
        CheckConstraint("evidence_role IN ('primary', 'corroborating', 'duplicate')", name="chk_evidence_role"),
        Index("idx_discovery_evidence_item", "source_item_id"),
    )

class Skill(Base):
    __tablename__ = "skills"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(255), nullable=True)
    difficulty = Column(String(50), default="beginner", nullable=False) # 'beginner', 'intermediate', 'advanced'
    is_curated = Column(Boolean, default=True, nullable=False)

    lesson = relationship("SkillLesson", back_populates="skill", uselist=False, cascade="all, delete-orphan")
    videos = relationship("LessonVideo", back_populates="skill", cascade="all, delete-orphan", order_by="LessonVideo.position")
    notes = relationship("SkillNote", back_populates="skill", cascade="all, delete-orphan")
    resources = relationship("SkillResource", back_populates="skill", cascade="all, delete-orphan")
    discoveries = relationship("DiscoverySkill", back_populates="skill", cascade="all, delete-orphan")
    roadmap_items = relationship("RoadmapItem", back_populates="skill")
    task = relationship("ChapterTask", back_populates="skill", uselist=False, cascade="all, delete-orphan")

    # Prerequisites relationship
    prerequisites = relationship(
        "Skill",
        secondary="skill_prerequisites",
        primaryjoin="Skill.id==SkillPrerequisite.skill_id",
        secondaryjoin="Skill.id==SkillPrerequisite.prerequisite_id",
        backref="required_for"
    )

    __table_args__ = (
        CheckConstraint("difficulty IN ('beginner', 'intermediate', 'advanced')", name="chk_skill_difficulty"),
    )

class SkillPrerequisite(Base):
    __tablename__ = "skill_prerequisites"

    skill_id = Column(UUIDType, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    prerequisite_id = Column(UUIDType, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)

    __table_args__ = (
        CheckConstraint("skill_id != prerequisite_id", name="chk_skill_no_self_prereq"),
        Index("idx_skill_prereq_reverse", "prerequisite_id"),
    )

class SkillLesson(Base):
    __tablename__ = "skill_lessons"

    skill_id = Column(UUIDType, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    overview = Column(Text, nullable=False)
    mini_project = Column(Text, nullable=True)

    skill = relationship("Skill", back_populates="lesson")

class LessonVideo(Base):
    __tablename__ = "lesson_videos"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    skill_id = Column(UUIDType, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    youtube_id = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    channel = Column(String(255), nullable=False)
    verified = Column(Boolean, default=False, nullable=False)
    verified_on = Column(Date, nullable=True)
    position = Column(Integer, default=0, nullable=False)

    skill = relationship("Skill", back_populates="videos")

    __table_args__ = (
        Index("idx_lesson_videos_skill_pos", "skill_id", "position"),
    )

class SkillNote(Base):
    __tablename__ = "skill_notes"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    skill_id = Column(UUIDType, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    content_md = Column(Text, nullable=False)
    origin = Column(String(50), default="ai_generated", nullable=False)
    status = Column(String(50), default="pending_review", nullable=False)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    skill = relationship("Skill", back_populates="notes")

    __table_args__ = (
        CheckConstraint("status IN ('pending_review', 'approved')", name="chk_skill_note_status"),
        Index("idx_skill_notes_skill_status", "skill_id", "status"),
    )

class UserNote(Base):
    __tablename__ = "user_notes"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id = Column(UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(UUIDType, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    video_id = Column(UUIDType, ForeignKey("lesson_videos.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, default="", nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="user_notes")
    skill = relationship("Skill")

    __table_args__ = (
        UniqueConstraint("user_id", "skill_id", name="uq_user_skill_note"),
        Index("idx_user_notes_user_skill", "user_id", "skill_id"),
    )

class SkillResource(Base):
    __tablename__ = "skill_resources"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    skill_id = Column(UUIDType, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    url = Column(Text, nullable=False)
    resource_type = Column(String(50), nullable=True)
    provider = Column(String(255), nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    mini_project = Column(Text, nullable=True)

    skill = relationship("Skill", back_populates="resources")

    __table_args__ = (
        CheckConstraint("resource_type IS NULL OR resource_type IN ('video', 'article', 'course', 'docs', 'tutorial', 'project')", name="chk_resource_type"),
        Index("idx_skill_resources_skill", "skill_id"),
    )

class DiscoverySkill(Base):
    __tablename__ = "discovery_skills"

    discovery_id = Column(UUIDType, ForeignKey("discoveries.id", ondelete="CASCADE"), primary_key=True)
    skill_id = Column(UUIDType, ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)
    relevance = Column(Numeric(4, 3), default=0.5, nullable=False)
    relationship_type = Column(String(50), default="related", nullable=False)

    discovery = relationship("Discovery", back_populates="skills")
    skill = relationship("Skill", back_populates="discoveries")

    __table_args__ = (
        CheckConstraint("relevance >= 0 AND relevance <= 1", name="chk_relevance_range"),
        CheckConstraint("relationship_type IN ('core', 'related', 'prerequisite')", name="chk_skill_rel_type"),
        Index("idx_discovery_skills_skill", "skill_id"),
    )

class UserDiscoveryState(Base):
    __tablename__ = "user_discovery_state"

    user_id = Column(UUIDType, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    discovery_id = Column(UUIDType, ForeignKey("discoveries.id", ondelete="CASCADE"), primary_key=True)
    state = Column(String(50), nullable=False) # 'saved', 'dismissed', 'accepted'
    relevance_score = Column(Numeric(5, 2), nullable=True)
    score_reason = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="discovery_states")
    discovery = relationship("Discovery", back_populates="user_states")

    __table_args__ = (
        CheckConstraint("state IN ('saved', 'dismissed', 'accepted')", name="chk_user_disc_state"),
        Index("idx_user_discovery_state_user_state", "user_id", "state"),
    )

class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    user_id = Column(UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    domain_id = Column(UUIDType, ForeignKey("domains.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), default="My Roadmap", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="roadmaps")
    domain = relationship("Domain", back_populates="roadmaps")
    items = relationship("RoadmapItem", back_populates="roadmap", cascade="all, delete-orphan", order_by="RoadmapItem.position")

    __table_args__ = (
        Index("idx_roadmaps_user", "user_id"),
    )

class RoadmapItem(Base):
    __tablename__ = "roadmap_items"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    roadmap_id = Column(UUIDType, ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(UUIDType, ForeignKey("skills.id", ondelete="RESTRICT"), nullable=False)
    added_from_discovery_id = Column(UUIDType, ForeignKey("discoveries.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="todo", nullable=False) # 'todo', 'in_progress', 'done'
    position = Column(Integer, default=0, nullable=False)
    source = Column(String(50), default="curated", nullable=False) # 'curated', 'suggested'
    target_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    roadmap = relationship("Roadmap", back_populates="items")
    skill = relationship("Skill", back_populates="roadmap_items")
    added_from_discovery = relationship("Discovery")

    __table_args__ = (
        UniqueConstraint("roadmap_id", "skill_id", name="uq_roadmap_skill"),
        CheckConstraint("status IN ('todo', 'in_progress', 'done')", name="chk_roadmap_item_status"),
        CheckConstraint("source IN ('curated', 'suggested')", name="chk_roadmap_item_source"),
        Index("idx_roadmap_items_roadmap_pos", "roadmap_id", "position"),
    )

class ChapterTask(Base):
    __tablename__ = "chapter_tasks"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    skill_id = Column(UUIDType, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, unique=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    instructions_md = Column(Text, nullable=False)
    starter_code = Column(Text, nullable=True)
    solution_criteria = Column(Text, nullable=True)
    rubric = Column(JSONType, nullable=False, default=list)
    difficulty = Column(String(50), default="intermediate", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    skill = relationship("Skill", back_populates="task")
    submissions = relationship("TaskSubmission", back_populates="task", cascade="all, delete-orphan", order_by="TaskSubmission.created_at.desc()")

    __table_args__ = (
        Index("idx_chapter_tasks_skill", "skill_id"),
    )

class TaskSubmission(Base):
    __tablename__ = "task_submissions"

    id = Column(UUIDType, primary_key=True, default=uuid.uuid4)
    task_id = Column(UUIDType, ForeignKey("chapter_tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUIDType, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    submission_code = Column(Text, nullable=False)
    score = Column(Integer, nullable=False)
    status = Column(String(50), default="remediation_required", nullable=False)
    summary = Column(Text, nullable=True)
    strengths = Column(JSONType, nullable=False, default=list)
    gaps = Column(JSONType, nullable=False, default=list)
    remediation = Column(JSONType, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    task = relationship("ChapterTask", back_populates="submissions")
    user = relationship("User", back_populates="task_submissions")

    __table_args__ = (
        CheckConstraint("status IN ('passed', 'remediation_required')", name="chk_task_sub_status"),
        Index("idx_task_submissions_user_task", "user_id", "task_id"),
    )

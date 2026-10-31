from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime, date
import uuid

# --- Health ---
class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "2.0.0"
    database: str = "connected"

# --- Auth ---
class UserRegisterRequest(BaseModel):
    email: str
    password: str

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserBasicInfo(BaseModel):
    id: uuid.UUID
    email: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserBasicInfo

# --- Domains ---
class DomainResponse(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    description: Optional[str] = None
    icon: str = "book"
    skill_count: int = 0
    completed_count: int = 0
    model_config = ConfigDict(from_attributes=True)

# --- Profile ---
class ProfileBase(BaseModel):
    display_name: Optional[str] = "Student"
    selected_domain_id: Optional[uuid.UUID] = None
    selected_domain_slug: Optional[str] = None
    experience_level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    career_goal: Optional[str] = "Software Engineer"
    interests: List[str] = Field(default_factory=list)
    current_skills: List[str] = Field(default_factory=list)
    weekly_study_minutes: Optional[int] = Field(default=300, ge=0)

class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    selected_domain_id: Optional[uuid.UUID] = None
    experience_level: Optional[Literal["beginner", "intermediate", "advanced"]] = None
    career_goal: Optional[str] = None
    interests: Optional[List[str]] = None
    current_skills: Optional[List[str]] = None
    weekly_study_minutes: Optional[int] = Field(default=None, ge=0)

class ProfileResponse(ProfileBase):
    user_id: uuid.UUID
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class UserMeResponse(BaseModel):
    id: uuid.UUID
    email: Optional[str] = None
    profile: Optional[ProfileResponse] = None
    model_config = ConfigDict(from_attributes=True)

# --- Evidence & Sources ---
class SourceInfo(BaseModel):
    source_name: str
    canonical_url: str
    published_at: Optional[datetime] = None
    author_publisher: Optional[str] = None

class EvidenceDetail(BaseModel):
    source_item_id: uuid.UUID
    source_name: str
    canonical_url: str
    title: str
    author_publisher: Optional[str] = None
    published_at: Optional[datetime] = None
    evidence_role: Literal["primary", "corroborating", "duplicate"] = "primary"

# --- Skills ---
class RelatedSkillItem(BaseModel):
    id: uuid.UUID
    slug: str
    name: str
    relevance: float = 0.5
    relationship_type: str = "related"
    difficulty: str = "beginner"
    is_in_roadmap: bool = False

class KeyTermItem(BaseModel):
    term: str
    simple_explanation: str
    analogy: Optional[str] = None

# --- Discoveries (v1 compat) ---
class IngestLiveRequest(BaseModel):
    input: str

class DiscoveryCard(BaseModel):
    id: uuid.UUID
    title: str
    summary: Optional[str] = None
    category: Optional[str] = None
    discovery_type: Optional[str] = None
    evidence_level: str = "New"
    score: Optional[float] = None
    score_reason: Optional[str] = None
    is_seeded: bool = False
    source: Optional[SourceInfo] = None
    primary_source: Optional[SourceInfo] = None
    why_it_matters: Optional[str] = None
    applications: List[str] = Field(default_factory=list)
    key_terms: List[KeyTermItem] = Field(default_factory=list)
    related_skills: List[RelatedSkillItem] = Field(default_factory=list)
    user_state: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DiscoveryFeedResponse(BaseModel):
    items: List[DiscoveryCard]
    total: int
    page: int
    limit: int
    live_count: int
    seeded_count: int

class DiscoveryDetail(BaseModel):
    id: uuid.UUID
    title: str
    summary: Optional[str] = None
    category: Optional[str] = None
    discovery_type: Optional[str] = None
    applications: List[str] = Field(default_factory=list)
    why_it_matters: Optional[str] = None
    key_terms: List[KeyTermItem] = Field(default_factory=list)
    evidence_level: str = "New"
    score: Optional[float] = None
    score_reason: Optional[str] = None
    is_seeded: bool = False
    created_at: datetime
    sources: List[EvidenceDetail] = Field(default_factory=list)
    evidence: List[EvidenceDetail] = Field(default_factory=list)
    skills: List[RelatedSkillItem] = Field(default_factory=list)
    related_skills: List[RelatedSkillItem] = Field(default_factory=list)
    primary_source: Optional[SourceInfo] = None
    user_state: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class DiscoveryActionRequest(BaseModel):
    state: Optional[Literal["saved", "dismissed", "none"]] = None
    action: Optional[Literal["saved", "dismissed", "none"]] = None

DiscoveriesFeedResponse = DiscoveryFeedResponse

class DiscoveryActionResponse(BaseModel):
    discovery_id: uuid.UUID
    state: Optional[str] = None
    success: bool = True
    updated_at: Optional[datetime] = None

# --- Roadmaps (v2) ---
class RoadmapCreateRequest(BaseModel):
    domain_id: Optional[uuid.UUID] = None
    title: Optional[str] = None

class RoadmapItemResponse(BaseModel):
    id: uuid.UUID
    skill_id: uuid.UUID
    slug: str
    name: str
    difficulty: str = "beginner"
    status: Literal["todo", "in_progress", "done"] = "todo"
    position: int = 0
    source: Literal["curated", "suggested"] = "curated"
    added_from_discovery_id: Optional[uuid.UUID] = None
    prerequisites: List[str] = Field(default_factory=list)
    resources: List[ResourceItem] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

class RoadmapDetailResponse(BaseModel):
    id: uuid.UUID
    domain_id: Optional[uuid.UUID] = None
    domain_name: Optional[str] = None
    title: str
    total_skills: int = 0
    completed_skills: int = 0
    items: List[RoadmapItemResponse] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

class RoadmapItemUpdate(BaseModel):
    status: Optional[Literal["todo", "in_progress", "done"]] = None
    position: Optional[int] = None
    notes: Optional[str] = None

# --- Suggestions (v2) ---
class SourceLink(BaseModel):
    title: str
    url: str

class SuggestionItem(BaseModel):
    discovery_id: uuid.UUID
    skill_slug: str
    skill_name: str
    title: str
    summary: Optional[str] = None
    source_type: str = "PAPER"  # 'PAPER', 'RELEASE'
    evidence_level: str = "NEW"  # 'NEW', 'EMERGING'
    score: float
    score_reason: str
    published_at: Optional[datetime] = None
    is_seeded: bool = False
    source_links: List[SourceLink] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

class SuggestionsResponse(BaseModel):
    total: int
    suggestions: List[SuggestionItem] = Field(default_factory=list)

# --- Learn Experience & Personal Notes (v2) ---
class FAQItem(BaseModel):
    question: str
    answer: str

class GlossaryTerm(BaseModel):
    term: str
    definition: str

class VideoKeyMoment(BaseModel):
    timestamp: str
    seconds: int
    title: str
    summary: str

class MindmapSubtopic(BaseModel):
    name: str
    summary: str
    key_rule: Optional[str] = None
    code_pattern: Optional[str] = None
    citation: Optional[str] = None

class StudyReport(BaseModel):
    title: str
    summary: str
    key_takeaways: List[str] = Field(default_factory=list)
    architecture_notes: Optional[str] = None
    common_pitfalls: List[str] = Field(default_factory=list)
    faq: List[FAQItem] = Field(default_factory=list)
    glossary: List[GlossaryTerm] = Field(default_factory=list)
    sources_count: int = 4
    synthesized_at: Optional[datetime] = None
    model_version: str = "NotebookLM Synthesis Engine"
    lecture_title: Optional[str] = None
    lecture_channel: Optional[str] = None
    lecture_youtube_id: Optional[str] = None
    video_key_moments: List[VideoKeyMoment] = Field(default_factory=list)

class MindmapNode(BaseModel):
    id: str
    label: str
    category: str
    description: Optional[str] = None
    subtopics: List[str] = Field(default_factory=list)
    detailed_subtopics: List[MindmapSubtopic] = Field(default_factory=list)

class FlashcardItem(BaseModel):
    id: str
    question: str
    answer: str
    code_example: Optional[str] = None
    concept: str

class LessonVideoResponse(BaseModel):
    id: uuid.UUID
    youtube_id: str
    title: str
    channel: str
    verified: bool = True
    verified_on: Optional[date] = None
    position: int = 0
    model_config = ConfigDict(from_attributes=True)

class SkillNoteResponse(BaseModel):
    id: uuid.UUID
    content_md: str
    origin: str = "ai_generated"
    status: str = "approved"
    label: str = "AI-generated study notes, reviewed"
    model_config = ConfigDict(from_attributes=True)

class SkillLearnResponse(BaseModel):
    skill_id: uuid.UUID
    slug: str
    name: str
    difficulty: str = "beginner"
    prerequisites: List[str] = Field(default_factory=list)
    overview: str
    mini_project: Optional[str] = None
    videos: List[LessonVideoResponse] = Field(default_factory=list)
    study_notes: Optional[SkillNoteResponse] = None
    report: Optional[StudyReport] = None
    mindmap: List[MindmapNode] = Field(default_factory=list)
    flashcards: List[FlashcardItem] = Field(default_factory=list)
    is_curated: bool = True
    model_config = ConfigDict(from_attributes=True)

class UserNoteResponse(BaseModel):
    skill_id: uuid.UUID
    content: str = ""
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class UserNoteUpdate(BaseModel):
    content: str

class IngestionTriggerRequest(BaseModel):
    source: Optional[str] = "all"

class IngestionRunResponse(BaseModel):
    run_id: uuid.UUID
    status: str
    items_fetched: int
    items_failed: int
    error_summary: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ResourceItem(BaseModel):
    id: uuid.UUID
    title: str
    url: str
    resource_type: Optional[str] = "article"
    provider: Optional[str] = None
    is_verified: bool = False
    mini_project: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class RoadmapItemDetail(BaseModel):
    id: uuid.UUID
    skill_id: uuid.UUID
    name: str
    slug: str
    difficulty: str
    category: Optional[str] = None
    status: str
    position: int
    target_date: Optional[date] = None
    notes: Optional[str] = None
    added_from_discovery_id: Optional[uuid.UUID] = None
    resources: List[ResourceItem] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

class RoadmapDetail(BaseModel):
    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    items: List[RoadmapItemDetail] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

class CreateRoadmapRequest(BaseModel):
    title: str = "My Roadmap"
    domain_id: Optional[uuid.UUID] = None

class AddRoadmapItemRequest(BaseModel):
    skill_id: uuid.UUID
    added_from_discovery_id: Optional[uuid.UUID] = None
    target_date: Optional[date] = None
    notes: Optional[str] = None

class UpdateRoadmapItemRequest(BaseModel):
    status: Optional[str] = None
    position: Optional[int] = None
    target_date: Optional[date] = None
    notes: Optional[str] = None

# Legacy Roadmap types for compatibility
class RoadmapSummary(BaseModel):
    id: uuid.UUID
    title: str
    created_at: Optional[datetime] = None
    total_items: int = 0
    completed_items: int = 0
    total_skills: int = 0
    completed_skills: int = 0
    in_progress_skills: int = 0
    model_config = ConfigDict(from_attributes=True)

# --- Chapter Tasks & AI Diagnostics (Byju's Mastery Model) ---
class RubricItem(BaseModel):
    criterion: str
    weight: int = 25
    description: Optional[str] = None

class RemediationItem(BaseModel):
    topic: str
    action: str
    target_video_timestamp: Optional[str] = None
    note_reference: Optional[str] = None

class TaskSubmissionResponse(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    submission_code: str
    score: int
    status: Literal["passed", "remediation_required"]
    summary: Optional[str] = None
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    remediation: List[RemediationItem] = Field(default_factory=list)
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChapterTaskResponse(BaseModel):
    id: uuid.UUID
    skill_id: uuid.UUID
    skill_slug: str
    skill_name: str
    title: str
    description: str
    instructions_md: str
    starter_code: Optional[str] = None
    rubric: List[RubricItem] = Field(default_factory=list)
    difficulty: str = "intermediate"
    latest_submission: Optional[TaskSubmissionResponse] = None
    model_config = ConfigDict(from_attributes=True)

class TaskSubmissionRequest(BaseModel):
    submission_code: str

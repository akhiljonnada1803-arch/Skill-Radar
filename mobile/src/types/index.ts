export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type EvidenceLevel = 'New' | 'Emerging' | 'NEW' | 'EMERGING';
export type RoadmapStatus = 'todo' | 'in_progress' | 'done';
export type UserDiscoveryAction = 'saved' | 'dismissed' | 'none';

export interface DomainItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  skill_count: number;
}

export interface StudentProfile {
  user_id: string;
  display_name: string;
  selected_domain_id?: string | null;
  selected_domain_slug?: string | null;
  experience_level: ExperienceLevel;
  career_goal?: string;
  interests: string[];
  current_skills: string[];
  weekly_study_minutes: number;
  updated_at: string;
}

export interface SourceLink {
  title: string;
  url: string;
}

export interface SuggestionItem {
  discovery_id: string;
  skill_slug: string;
  skill_name: string;
  title: string;
  summary?: string | null;
  source_type: string; // 'PAPER' | 'RELEASE'
  evidence_level: string; // 'NEW' | 'EMERGING'
  score: number;
  score_reason: string;
  published_at?: string | null;
  is_seeded: boolean;
  source_links: SourceLink[];
}

export interface SuggestionsResponse {
  total: number;
  suggestions: SuggestionItem[];
}

export interface LessonVideo {
  id: string;
  youtube_id: string;
  title: string;
  channel: string;
  verified: boolean;
  verified_on?: string | null;
  position: number;
}

export interface SkillNote {
  id: string;
  content_md: string;
  origin: string;
  status: string;
  label: string;
}

export interface SkillLearn {
  skill_id: string;
  slug: string;
  name: string;
  difficulty: ExperienceLevel;
  prerequisites: string[];
  overview: string;
  mini_project?: string | null;
  videos: LessonVideo[];
  study_notes?: SkillNote | null;
  is_curated: boolean;
}

export interface UserNote {
  skill_id: string;
  content: string;
  updated_at: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  url: string;
  resource_type: string;
  provider?: string | null;
  is_verified: boolean;
  mini_project?: string | null;
}

export interface RoadmapItemDetail {
  id: string;
  skill_id: string;
  name: string;
  slug: string;
  difficulty: ExperienceLevel;
  status: RoadmapStatus;
  position: number;
  source: 'curated' | 'suggested';
  added_from_discovery_id?: string | null;
  target_date?: string | null;
  notes?: string | null;
  prerequisites: string[];
  resources: ResourceItem[];
}

export interface RoadmapDetail {
  id: string;
  domain_id?: string | null;
  domain_name?: string | null;
  title: string;
  total_skills: number;
  completed_skills: number;
  items: RoadmapItemDetail[];
}

export interface RoadmapSummary {
  id: string;
  title: string;
  created_at?: string;
  total_items: number;
  completed_items: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email?: string | null;
  };
}

export interface UserMe {
  id: string;
  email?: string | null;
  profile?: StudentProfile | null;
}

// Legacy types for compatibility
export interface SourceInfo {
  source_name: string;
  canonical_url: string;
  published_at?: string | null;
  author_publisher?: string | null;
}

export interface EvidenceDetail {
  source_item_id: string;
  source_name: string;
  canonical_url: string;
  title: string;
  author_publisher?: string | null;
  published_at?: string | null;
  evidence_role: 'primary' | 'corroborating' | 'duplicate';
}

export interface RelatedSkillItem {
  id: string;
  slug: string;
  name: string;
  relevance: number;
  relationship_type: string;
  difficulty: ExperienceLevel;
  is_in_roadmap: boolean;
}

export interface DiscoveryCardItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  discovery_type: string;
  applications: string[];
  why_it_matters: string;
  evidence_level: EvidenceLevel;
  is_seeded: boolean;
  score: number;
  score_reason: string;
  created_at: string;
  primary_source?: SourceInfo;
  user_state?: 'saved' | 'dismissed' | null;
}

export interface DiscoveryDetailItem extends DiscoveryCardItem {
  evidence: EvidenceDetail[];
  related_skills: RelatedSkillItem[];
}

export interface FeedResponse {
  items: DiscoveryCardItem[];
  total: number;
  page: number;
  limit: number;
  live_count: number;
  seeded_count: number;
}

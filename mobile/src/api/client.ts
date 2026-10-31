import {
  StudentProfile, DomainItem, RoadmapDetail, RoadmapItemDetail,
  SuggestionItem, SuggestionsResponse, SkillLearn, UserNote,
  AuthResponse, UserMe, ChapterTask, TaskSubmission
} from '../types';
import {
  mockDomains, mockProfile, mockRoadmapDetail, mockSuggestions,
  mockSkillLearnMap, mockUserNotesMap, mockDiscoveries, mockDiscoveryDetails
} from './mockData';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

export class ApiError extends Error {
  isHttpError: boolean = true;
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let authToken: string | null = null;
let currentProfileState = { ...mockProfile };
let activeRoadmapState = JSON.parse(JSON.stringify(mockRoadmapDetail)) as RoadmapDetail;
let activeSuggestions = [...mockSuggestions];
let activeDiscoveriesState = JSON.parse(JSON.stringify(mockDiscoveries));
let userNotesState: Record<string, string> = {
  'skill-05': 'Key takeaway from field practice: Chunk overlap of 15% is essential when code blocks span multiple paragraphs.',
};

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (USE_MOCK) {
    throw new Error('MOCK_MODE');
  }

  const url = `${BASE_URL}/api/v1${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    throw err;
  }

  if (!response.ok) {
    let errorDetail = `API error ${response.status}`;
    try {
      const rawText = await response.text();
      try {
        const errorJson = JSON.parse(rawText);
        if (errorJson && errorJson.detail) {
          errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        } else if (rawText) {
          errorDetail = rawText;
        }
      } catch {
        if (rawText) errorDetail = rawText;
      }
    } catch {
      // ignore
    }
    throw new ApiError(errorDetail, response.status);
  }
  return response.json();
}

export const api = {
  // Auth
  register: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const res = await request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(res.access_token);
      return res;
    } catch (err: any) {
      if (err instanceof ApiError || err?.isHttpError) {
        throw err;
      }
      if (USE_MOCK || err?.name === 'TypeError' || err?.message?.includes('fetch') || err?.message?.includes('Network')) {
        const mockRes: AuthResponse = {
          access_token: 'mock-jwt-token-expedition-2026',
          token_type: 'bearer',
          user: { id: '00000000-0000-0000-0000-000000000001', email },
        };
        setAuthToken(mockRes.access_token);
        return mockRes;
      }
      throw err;
    }
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const res = await request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuthToken(res.access_token);
      return res;
    } catch (err: any) {
      if (err instanceof ApiError || err?.isHttpError) {
        throw err;
      }
      if (USE_MOCK || err?.name === 'TypeError' || err?.message?.includes('fetch') || err?.message?.includes('Network')) {
        const mockRes: AuthResponse = {
          access_token: 'mock-jwt-token-expedition-2026',
          token_type: 'bearer',
          user: { id: '00000000-0000-0000-0000-000000000001', email },
        };
        setAuthToken(mockRes.access_token);
        return mockRes;
      }
      throw err;
    }
  },

  getMe: async (): Promise<UserMe> => {
    try {
      return await request<UserMe>('/auth/me');
    } catch {
      return {
        id: currentProfileState.user_id,
        email: 'alex.rivera@fieldsurvey.org',
        profile: currentProfileState,
      };
    }
  },

  logout: async () => {
    setAuthToken(null);
  },

  // Domains
  getDomains: async (): Promise<DomainItem[]> => {
    try {
      return await request<DomainItem[]>('/domains');
    } catch {
      return mockDomains;
    }
  },

  // Profile
  getProfile: async (): Promise<StudentProfile> => {
    try {
      return await request<StudentProfile>('/profile');
    } catch {
      return currentProfileState;
    }
  },

  updateProfile: async (data: Partial<StudentProfile>): Promise<StudentProfile> => {
    try {
      return await request<StudentProfile>('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch {
      currentProfileState = { ...currentProfileState, ...data, updated_at: new Date().toISOString() };
      return currentProfileState;
    }
  },

  // Roadmaps
  getCurrentRoadmap: async (domainId?: string): Promise<RoadmapDetail> => {
    try {
      const q = domainId ? `?domain_id=${encodeURIComponent(domainId)}` : '';
      return await request<RoadmapDetail>(`/roadmaps/current${q}`);
    } catch {
      return activeRoadmapState;
    }
  },

  createRoadmap: async (domainId: string): Promise<RoadmapDetail> => {
    try {
      return await request<RoadmapDetail>('/roadmaps', {
        method: 'POST',
        body: JSON.stringify({ domain_id: domainId }),
      });
    } catch {
      const domain = mockDomains.find(d => d.id === domainId) || mockDomains[0];
      activeRoadmapState.domain_id = domain.id;
      activeRoadmapState.domain_name = domain.name;
      activeRoadmapState.title = `${domain.name} Expedition Roadmap`;
      return activeRoadmapState;
    }
  },

  updateRoadmapItem: async (itemId: string, patch: Partial<RoadmapItemDetail>): Promise<RoadmapItemDetail> => {
    try {
      return await request<RoadmapItemDetail>(`/roadmaps/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    } catch {
      const item = activeRoadmapState.items.find(i => i.id === itemId);
      if (item) {
        Object.assign(item, patch);
        activeRoadmapState.completed_skills = activeRoadmapState.items.filter(i => i.status === 'done').length;
        return item;
      }
      throw new Error('Item not found in mock roadmap');
    }
  },

  deleteRoadmapItem: async (itemId: string): Promise<void> => {
    try {
      await request<void>(`/roadmaps/items/${itemId}`, { method: 'DELETE' });
    } catch {
      activeRoadmapState.items = activeRoadmapState.items.filter(i => i.id !== itemId);
      activeRoadmapState.total_skills = activeRoadmapState.items.length;
      activeRoadmapState.completed_skills = activeRoadmapState.items.filter(i => i.status === 'done').length;
    }
  },

  // Suggestions
  getSuggestions: async (roadmapId: string): Promise<SuggestionsResponse> => {
    try {
      return await request<SuggestionsResponse>(`/roadmaps/${roadmapId}/suggestions`);
    } catch {
      return {
        total: activeSuggestions.length,
        suggestions: activeSuggestions,
      };
    }
  },

  acceptSuggestion: async (roadmapId: string, discoveryId: string): Promise<RoadmapItemDetail> => {
    try {
      return await request<RoadmapItemDetail>(`/roadmaps/${roadmapId}/suggestions/${discoveryId}/accept`, {
        method: 'POST',
      });
    } catch {
      const suggestion = activeSuggestions.find(s => s.discovery_id === discoveryId);
      const newItem: RoadmapItemDetail = {
        id: `suggested-item-${Date.now()}`,
        skill_id: `skill-${Date.now()}`,
        name: suggestion ? suggestion.skill_name : 'Suggested Frontier Competency',
        slug: suggestion ? suggestion.skill_slug : 'suggested-competency',
        difficulty: 'intermediate',
        status: 'todo',
        position: activeRoadmapState.items.length,
        source: 'suggested',
        added_from_discovery_id: discoveryId,
        prerequisites: [],
        resources: [],
      };
      activeRoadmapState.items.push(newItem);
      activeRoadmapState.total_skills = activeRoadmapState.items.length;
      activeSuggestions = activeSuggestions.filter(s => s.discovery_id !== discoveryId);
      return newItem;
    }
  },

  dismissSuggestion: async (roadmapId: string, discoveryId: string): Promise<void> => {
    try {
      await request<void>(`/roadmaps/${roadmapId}/suggestions/${discoveryId}/dismiss`, {
        method: 'POST',
      });
    } catch {
      activeSuggestions = activeSuggestions.filter(s => s.discovery_id !== discoveryId);
    }
  },

  // Learn Experience & Notes
  getSkillLearn: async (skillId: string): Promise<SkillLearn> => {
    try {
      return await request<SkillLearn>(`/skills/${skillId}/learn`);
    } catch {
      // Find in mock map or generate default
      for (const key of Object.keys(mockSkillLearnMap)) {
        if (mockSkillLearnMap[key].skill_id === skillId || mockSkillLearnMap[key].slug === skillId) {
          return mockSkillLearnMap[key];
        }
      }
      return {
        skill_id: skillId,
        slug: 'frontier-competency',
        name: 'Technical Competency Log',
        difficulty: 'intermediate',
        prerequisites: [],
        overview: 'Overview derived from technical paper literature.',
        mini_project: 'Implement a minimal reproduction script exercising core invariants.',
        videos: [],
        study_notes: null,
        is_curated: false,
      };
    }
  },

  getUserNote: async (skillId: string): Promise<UserNote> => {
    try {
      return await request<UserNote>(`/skills/${skillId}/notes/me`);
    } catch {
      return {
        skill_id: skillId,
        content: userNotesState[skillId] || '',
        updated_at: new Date().toISOString(),
      };
    }
  },

  saveUserNote: async (skillId: string, content: string): Promise<UserNote> => {
    try {
      return await request<UserNote>(`/skills/${skillId}/notes/me`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
    } catch {
      userNotesState[skillId] = content;
      return {
        skill_id: skillId,
        content,
        updated_at: new Date().toISOString(),
      };
    }
  },

  synthesizeChapterMaterials: async (skillId: string): Promise<SkillLearn> => {
    try {
      return await request<SkillLearn>(`/skills/${skillId}/synthesize`, {
        method: 'POST',
      });
    } catch {
      return api.getSkillLearn(skillId);
    }
  },

  // Discoveries & Saved
  getSaved: async (): Promise<any[]> => {
    try {
      return await request<any[]>('/discoveries/saved');
    } catch {
      return activeDiscoveriesState.filter((d: any) => d.user_state === 'saved');
    }
  },

  setAction: async (discoveryId: string, action: string): Promise<any> => {
    try {
      return await request<any>(`/discoveries/${discoveryId}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
    } catch {
      const item = activeDiscoveriesState.find((d: any) => d.id === discoveryId);
      if (item) {
        item.user_state = action === 'none' ? null : action;
      }
      return { success: true, action };
    }
  },

  getDiscoveries: async (filter?: string): Promise<any> => {
    try {
      const query = filter && filter !== 'all' ? `?filter=${filter}` : '';
      return await request<any>(`/discoveries${query}`);
    } catch {
      let filtered = activeDiscoveriesState.filter((d: any) => d.user_state !== 'dismissed');
      if (filter === 'live') {
        filtered = filtered.filter((d: any) => !d.is_seeded);
      } else if (filter === 'seeded') {
        filtered = filtered.filter((d: any) => d.is_seeded);
      }
      return {
        items: filtered,
        total: filtered.length,
        live_count: activeDiscoveriesState.filter((d: any) => !d.is_seeded && d.user_state !== 'dismissed').length,
        seeded_count: activeDiscoveriesState.filter((d: any) => d.is_seeded && d.user_state !== 'dismissed').length,
      };
    }
  },

  getDiscoveryDetail: async (id: string): Promise<any> => {
    try {
      const data = await request<any>(`/discoveries/${id}`);
      if (data && !data.primary_source && data.evidence && data.evidence.length > 0) {
        const prim = data.evidence.find((e: any) => e.evidence_role === 'primary') || data.evidence[0];
        data.primary_source = {
          source_name: prim.source_name,
          canonical_url: prim.canonical_url,
          published_at: prim.published_at,
          author_publisher: prim.author_publisher,
        };
      }
      return data;
    } catch {
      return mockDiscoveryDetails[id] || activeDiscoveriesState.find((d: any) => d.id === id) || null;
    }
  },

  ingestLiveDiscovery: async (input: string): Promise<any> => {
    try {
      return await request<any>('/discoveries/ingest-live', {
        method: 'POST',
        body: JSON.stringify({ input }),
      });
    } catch {
      const cleanTitle = input.startsWith('http')
        ? (input.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') || input)
        : input;
      const newDisc: any = {
        id: `live-${Date.now()}`,
        title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
        summary: `Autonomous live telemetry and technical breakdown for ${input}.`,
        category: 'AI Agents & Autonomous Systems',
        discovery_type: 'article',
        evidence_level: 'Emerging',
        score: 0.99,
        score_reason: 'Live on-demand ingested telemetry',
        is_seeded: false,
        primary_source: {
          source_name: 'Frontier Industry Telemetry',
          canonical_url: input.startsWith('http') ? input : `https://skillradar.ai/frontier/${encodeURIComponent(input)}`,
        },
        why_it_matters: 'Directly impacts standard software engineering architecture and current production AI deployments.',
        created_at: new Date().toISOString(),
      };
      activeDiscoveriesState.unshift(newDisc);
      return newDisc;
    }
  },

  getRoadmaps: async (): Promise<any[]> => {
    try {
      return await request<any[]>('/roadmaps');
    } catch {
      return [activeRoadmapState];
    }
  },

  getRoadmapDetail: async (id: string): Promise<RoadmapDetail> => {
    return api.getCurrentRoadmap();
  },

  updateRoadmapItemStatus: async (arg1: string, arg2: any, arg3?: any): Promise<any> => {
    if (arg3 !== undefined) {
      return api.updateRoadmapItem(arg2, { status: arg3 });
    }
    return api.updateRoadmapItem(arg1, { status: arg2 });
  },

  addSkillToRoadmap: async (roadmapId: string, skillId: string, discoveryId?: string): Promise<any> => {
    try {
      return await request<any>(`/roadmaps/${roadmapId}/items`, {
        method: 'POST',
        body: JSON.stringify({ skill_id: skillId, discovery_id: discoveryId }),
      });
    } catch {
      const existing = activeRoadmapState.items.find(i => i.skill_id === skillId);
      if (!existing) {
        const newItem: RoadmapItemDetail = {
          id: `item-${Date.now()}`,
          skill_id: skillId,
          name: skillId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          slug: skillId,
          difficulty: 'intermediate',
          status: 'todo',
          position: activeRoadmapState.items.length,
          source: 'suggested',
          added_from_discovery_id: discoveryId,
          prerequisites: [],
          resources: [],
        };
        activeRoadmapState.items.push(newItem);
        activeRoadmapState.total_skills = activeRoadmapState.items.length;
        return newItem;
      }
      return existing;
    }
  },

  // Chapter Mastery Tasks & AI Evaluator
  getChapterTask: async (skillId: string): Promise<ChapterTask> => {
    try {
      return await request<ChapterTask>(`/skills/${skillId}/task`);
    } catch {
      return {
        id: `task-${skillId}`,
        skill_id: skillId,
        skill_slug: skillId,
        skill_name: skillId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        title: `Mission: ${skillId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} Applied Mastery`,
        description: `Implement and demonstrate core practical mechanics for ${skillId}.`,
        instructions_md: `### Objective\nBuild a verified practical module demonstrating hands-on mastery.\n\n### Acceptance Criteria\n1. Implement the required functions or components with clean modular syntax.\n2. Ensure proper exception trapping and defensive boundaries.\n3. Align with production engineering best practices.`,
        starter_code: `// Chapter Mission: ${skillId}\n// Implement your solution below:\n\n`,
        rubric: [
          { criterion: 'Core Mechanics & Correctness', weight: 40, description: 'Accurate functional implementation' },
          { criterion: 'Defensive Trapping & Reliability', weight: 30, description: 'Error handling and edge case resilience' },
          { criterion: 'Code Quality & Modularity', weight: 30, description: 'Clean architecture and style' },
        ],
        difficulty: 'intermediate',
        latest_submission: null,
      };
    }
  },

  submitChapterTask: async (skillId: string, submissionCode: string): Promise<TaskSubmission> => {
    try {
      return await request<TaskSubmission>(`/skills/${skillId}/task/submit`, {
        method: 'POST',
        body: JSON.stringify({ submission_code: submissionCode }),
      });
    } catch {
      const isGood = submissionCode.length > 50;
      return {
        id: `sub-${Date.now()}`,
        task_id: `task-${skillId}`,
        user_id: '00000000-0000-0000-0000-000000000001',
        submission_code: submissionCode,
        score: isGood ? 85 : 65,
        status: isGood ? 'passed' : 'remediation_required',
        summary: isGood
          ? 'Solid implementation. Demonstrated core competency with defensive error handling.'
          : 'Submission is brief and requires additional error handling to reach chapter certification.',
        strengths: ['Effective functional decomposition', 'Clean syntax formatting'],
        gaps: isGood ? [] : ['Lacks explicit error boundaries and failure recovery.'],
        remediation: isGood
          ? []
          : [
              {
                topic: 'Defensive State & Error Trapping',
                action: 'Review the chapter study notes on exception boundaries.',
                target_video_timestamp: '03:45',
                note_reference: 'Section: Error Trapping & Recovery',
              },
            ],
        created_at: new Date().toISOString(),
      };
    }
  },
};

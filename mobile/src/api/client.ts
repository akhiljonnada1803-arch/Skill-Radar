import {
  StudentProfile, DomainItem, RoadmapDetail, RoadmapItemDetail,
  SuggestionItem, SuggestionsResponse, SkillLearn, UserNote,
  AuthResponse, UserMe
} from '../types';
import {
  mockDomains, mockProfile, mockRoadmapDetail, mockSuggestions,
  mockSkillLearnMap, mockUserNotesMap
} from './mockData';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

let authToken: string | null = null;
let currentProfileState = { ...mockProfile };
let activeRoadmapState = JSON.parse(JSON.stringify(mockRoadmapDetail)) as RoadmapDetail;
let activeSuggestions = [...mockSuggestions];
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

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
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
    } catch {
      const mockRes: AuthResponse = {
        access_token: 'mock-jwt-token-expedition-2026',
        token_type: 'bearer',
        user: { id: '00000000-0000-0000-0000-000000000001', email },
      };
      setAuthToken(mockRes.access_token);
      return mockRes;
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
    } catch {
      const mockRes: AuthResponse = {
        access_token: 'mock-jwt-token-expedition-2026',
        token_type: 'bearer',
        user: { id: '00000000-0000-0000-0000-000000000001', email },
      };
      setAuthToken(mockRes.access_token);
      return mockRes;
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
  getCurrentRoadmap: async (): Promise<RoadmapDetail> => {
    try {
      return await request<RoadmapDetail>('/roadmaps/current');
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

  // Legacy compatibility helpers
  getSaved: async (): Promise<any[]> => {
    try {
      return await request<any[]>('/discoveries/saved');
    } catch {
      return activeSuggestions.filter(s => s.is_seeded);
    }
  },

  setAction: async (discoveryId: string, action: string): Promise<any> => {
    try {
      return await request<any>(`/discoveries/${discoveryId}/actions`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
    } catch {
      return { success: true };
    }
  },

  getDiscoveries: async (): Promise<any> => {
    try {
      return await request<any>('/discoveries');
    } catch {
      return { items: [], total: 0, live_count: 0, seeded_count: 0 };
    }
  },

  getDiscoveryDetail: async (id: string): Promise<any> => {
    try {
      return await request<any>(`/discoveries/${id}`);
    } catch {
      return null;
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
    return api.acceptSuggestion(roadmapId, discoveryId || skillId);
  },
};

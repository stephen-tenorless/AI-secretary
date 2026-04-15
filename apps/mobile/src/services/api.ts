import Constants from 'expo-constants';
import type {
  Task,
  Project,
  ScheduleEvent,
  TaskGroup,
  AIMessage,
  UserProfile,
  ApiResponse,
  PaginatedResponse,
} from '@ai-secretary/shared';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.ai-secretary.dev';

let authToken: string | null = null;

export function setApiToken(token: string | null) {
  authToken = token;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    return { success: false, error: error.message || `HTTP ${response.status}` };
  }

  return response.json();
}

// --- Tasks API ---

export const tasksApi = {
  list: (params?: { category?: string; status?: string }) =>
    request<Task[]>(`/tasks${toQuery(params)}`),

  get: (id: string) =>
    request<Task>(`/tasks/${id}`),

  create: (task: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    request<Task>('/tasks', { method: 'POST', body: JSON.stringify(task) }),

  update: (id: string, updates: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

  delete: (id: string) =>
    request<void>(`/tasks/${id}`, { method: 'DELETE' }),
};

// --- Projects API ---

export const projectsApi = {
  list: () => request<Project[]>('/projects'),

  get: (id: string) => request<Project>(`/projects/${id}`),

  create: (project: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(project) }),

  update: (id: string, updates: Partial<Project>) =>
    request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
};

// --- Events API ---

export const eventsApi = {
  list: (params?: { startDate?: string; endDate?: string }) =>
    request<ScheduleEvent[]>(`/events${toQuery(params)}`),

  create: (event: Omit<ScheduleEvent, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    request<ScheduleEvent>('/events', { method: 'POST', body: JSON.stringify(event) }),

  update: (id: string, updates: Partial<ScheduleEvent>) =>
    request<ScheduleEvent>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

  delete: (id: string) =>
    request<void>(`/events/${id}`, { method: 'DELETE' }),
};

// --- Smart Groups API ---

export const groupsApi = {
  list: () => request<TaskGroup[]>('/groups'),

  accept: (id: string) =>
    request<TaskGroup>(`/groups/${id}/accept`, { method: 'POST' }),

  dismiss: (id: string) =>
    request<void>(`/groups/${id}`, { method: 'DELETE' }),

  requestSuggestions: () =>
    request<TaskGroup[]>('/ai/suggest-groups', { method: 'POST' }),
};

// --- AI Chat API ---

export const aiApi = {
  chat: (message: string, conversationId?: string) =>
    request<{ reply: AIMessage; actions?: AIMessage['actions'] }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
    }),

  analyze: () =>
    request<{ insights: string[]; suggestions: string[] }>('/ai/analyze', {
      method: 'POST',
    }),
};

// --- User API ---

export const userApi = {
  getProfile: () => request<UserProfile>('/profile'),

  updateProfile: (updates: Partial<UserProfile>) =>
    request<UserProfile>('/profile', { method: 'PUT', body: JSON.stringify(updates) }),

  registerDevice: (pushToken: string) =>
    request<void>('/notifications/register', {
      method: 'POST',
      body: JSON.stringify({ pushToken }),
    }),
};

// --- Auth API ---

export const authApi = {
  signIn: (email: string, password: string) =>
    request<{ token: string; user: UserProfile }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signUp: (email: string, password: string, name: string) =>
    request<{ token: string; user: UserProfile }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  signOut: () =>
    request<void>('/auth/signout', { method: 'POST' }),
};

// --- Helpers ---

function toQuery(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries as [string, string][]).toString();
}

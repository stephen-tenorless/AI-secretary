export const TASK_CATEGORIES = [
  { key: 'home', label: 'Home', icon: 'home', color: '#F97316' },
  { key: 'work', label: 'Work', icon: 'briefcase', color: '#3B82F6' },
  { key: 'personal', label: 'Personal', icon: 'user', color: '#8B5CF6' },
  { key: 'health', label: 'Health', icon: 'heart', color: '#EF4444' },
  { key: 'errands', label: 'Errands', icon: 'shopping-cart', color: '#10B981' },
  { key: 'finance', label: 'Finance', icon: 'dollar-sign', color: '#F59E0B' },
] as const;

export const PRIORITIES = [
  { key: 'urgent', label: 'Urgent', color: '#EF4444' },
  { key: 'high', label: 'High', color: '#F97316' },
  { key: 'medium', label: 'Medium', color: '#F59E0B' },
  { key: 'low', label: 'Low', color: '#6B7280' },
] as const;

export const API_ROUTES = {
  TASKS: '/tasks',
  TASK_BY_ID: '/tasks/:id',
  PROJECTS: '/projects',
  PROJECT_BY_ID: '/projects/:id',
  EVENTS: '/events',
  EVENT_BY_ID: '/events/:id',
  GROUPS: '/groups',
  AI_CHAT: '/ai/chat',
  AI_ANALYZE: '/ai/analyze',
  AI_SUGGEST_GROUPS: '/ai/suggest-groups',
  PROFILE: '/profile',
  NOTIFICATIONS: '/notifications',
  NOTIFICATIONS_REGISTER: '/notifications/register',
} as const;

export const DYNAMO_TABLES = {
  TASKS: 'ai-secretary-tasks',
  PROJECTS: 'ai-secretary-projects',
  EVENTS: 'ai-secretary-events',
  GROUPS: 'ai-secretary-groups',
  CONVERSATIONS: 'ai-secretary-conversations',
  USERS: 'ai-secretary-users',
  NOTIFICATIONS: 'ai-secretary-notifications',
} as const;

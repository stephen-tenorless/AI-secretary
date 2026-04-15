// ============================================================
// AI Secretary - Shared Types
// ============================================================

// --- Core Entities ---

export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
export type TaskCategory = 'home' | 'work' | 'personal' | 'health' | 'errands' | 'finance';
export type RecurrencePattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string; // ISO 8601
  scheduledDate?: string; // ISO 8601
  estimatedMinutes?: number;
  location?: string;
  tags: string[];
  prerequisites: TaskPrerequisite[];
  subtasks: Subtask[];
  recurrence?: RecurrenceRule;
  projectId?: string;
  groupId?: string; // for smart grouping
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskPrerequisite {
  type: 'time_before' | 'task_dependency' | 'condition';
  /** e.g., "fast for 12 hours", "pick up materials first" */
  description: string;
  /** Hours before the task that this prerequisite must start */
  hoursBeforeTask?: number;
  /** ID of dependent task that must complete first */
  dependsOnTaskId?: string;
}

export interface RecurrenceRule {
  pattern: RecurrencePattern;
  interval: number; // every N days/weeks/months
  daysOfWeek?: number[]; // 0=Sun, 6=Sat
  endDate?: string;
}

// --- Projects (e.g., "Kitchen Renovation") ---

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: TaskCategory;
  status: 'active' | 'paused' | 'completed';
  taskIds: string[];
  budget?: number;
  spentAmount?: number;
  startDate?: string;
  targetEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Schedule & Calendar ---

export interface ScheduleEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  location?: string;
  isAllDay: boolean;
  source: 'manual' | 'email' | 'calendar_sync' | 'ai_suggested';
  linkedTaskId?: string;
  reminders: Reminder[];
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  type: 'push' | 'email' | 'sms';
  minutesBefore: number;
  message?: string;
  sent: boolean;
  sentAt?: string;
}

// --- Smart Grouping ---

export interface TaskGroup {
  id: string;
  userId: string;
  name: string;
  reason: string; // AI-generated explanation
  taskIds: string[];
  suggestedDate?: string;
  suggestedRoute?: string; // e.g., "Home Depot → Pharmacy → Grocery Store"
  estimatedTotalMinutes: number;
  accepted: boolean;
  createdAt: string;
}

// --- AI Agent ---

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actions?: AIAction[];
}

export interface AIAction {
  type: 'create_task' | 'update_task' | 'create_event' | 'send_reminder' | 'suggest_group' | 'reschedule';
  description: string;
  payload: Record<string, unknown>;
  executed: boolean;
}

export interface AIConversation {
  id: string;
  userId: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

// --- User & Preferences ---

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  timezone: string;
  preferences: UserPreferences;
  integrations: UserIntegrations;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  wakeUpTime: string; // "07:00"
  sleepTime: string; // "22:00"
  workStartTime: string; // "09:00"
  workEndTime: string; // "17:00"
  preferredReminderLeadMinutes: number;
  enableSmartGrouping: boolean;
  enableProactiveReminders: boolean;
  notificationChannels: ('push' | 'email' | 'sms')[];
}

export interface UserIntegrations {
  googleCalendar?: { connected: boolean; lastSync?: string };
  gmail?: { connected: boolean; lastSync?: string };
  outlook?: { connected: boolean; lastSync?: string };
}

// --- API Types ---

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  nextToken?: string;
  totalCount?: number;
}

// --- Notification Types ---

export interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  scheduledFor?: string; // ISO 8601 for scheduled notifications
  channels: ('push' | 'email' | 'sms')[];
}

import { create } from 'zustand';
import type {
  Task,
  Project,
  ScheduleEvent,
  TaskGroup,
  AIMessage,
  UserProfile,
} from '@ai-secretary/shared';

interface AppState {
  // Auth
  isAuthenticated: boolean;
  authToken: string | null;
  setAuth: (token: string | null) => void;

  // User
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;

  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;

  // Projects
  projects: Project[];
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;

  // Schedule
  events: ScheduleEvent[];
  setEvents: (events: ScheduleEvent[]) => void;
  addEvent: (event: ScheduleEvent) => void;

  // Smart Groups
  taskGroups: TaskGroup[];
  setTaskGroups: (groups: TaskGroup[]) => void;

  // AI Chat
  chatMessages: AIMessage[];
  setChatMessages: (messages: AIMessage[]) => void;
  addChatMessage: (message: AIMessage) => void;

  // UI State
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth
  isAuthenticated: false,
  authToken: null,
  setAuth: (token) =>
    set({ authToken: token, isAuthenticated: !!token }),

  // User
  user: null,
  setUser: (user) => set({ user }),

  // Tasks
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTask: (id) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  // Projects
  projects: [],
  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((state) => ({ projects: [...state.projects, project] })),

  // Schedule
  events: [],
  setEvents: (events) => set({ events }),
  addEvent: (event) =>
    set((state) => ({ events: [...state.events, event] })),

  // Smart Groups
  taskGroups: [],
  setTaskGroups: (taskGroups) => set({ taskGroups }),

  // AI Chat
  chatMessages: [],
  setChatMessages: (chatMessages) => set({ chatMessages }),
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),

  // UI State
  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),
}));

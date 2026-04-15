import type { Priority, TaskCategory } from '../types';

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateTime(isoString: string): string {
  return `${formatDate(isoString)} at ${formatTime(isoString)}`;
}

export function getRelativeTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMins) < 60) {
    if (diffMins < 0) return `${Math.abs(diffMins)}m ago`;
    return `in ${diffMins}m`;
  }
  if (Math.abs(diffHours) < 24) {
    if (diffHours < 0) return `${Math.abs(diffHours)}h ago`;
    return `in ${diffHours}h`;
  }
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  return `in ${diffDays}d`;
}

export function priorityWeight(priority: Priority): number {
  const weights: Record<Priority, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return weights[priority];
}

export function getCategoryColor(category: TaskCategory): string {
  const colors: Record<TaskCategory, string> = {
    home: '#F97316',
    work: '#3B82F6',
    personal: '#8B5CF6',
    health: '#EF4444',
    errands: '#10B981',
    finance: '#F59E0B',
  };
  return colors[category];
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Task, ScheduleEvent, TaskGroup } from '@ai-secretary/shared';
import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useStore } from '../../store/useStore';
import { TaskCard } from '../../components/TaskCard';
import { SmartGroupCard } from '../../components/SmartGroupCard';
import { tasksApi, eventsApi, groupsApi } from '../../services/api';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { tasks, setTasks, events, setEvents, taskGroups, setTaskGroups, updateTask, user } =
    useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const greeting = getGreeting();

  const todayTasks = tasks
    .filter(
      (t) =>
        t.status !== 'completed' &&
        t.status !== 'cancelled' &&
        (!t.dueDate || t.dueDate.startsWith(todayStr) || new Date(t.dueDate) < new Date())
    )
    .sort((a, b) => {
      const pw = { urgent: 4, high: 3, medium: 2, low: 1 };
      return (pw[b.priority] || 0) - (pw[a.priority] || 0);
    });

  const todayEvents = events
    .filter((e) => e.startTime.startsWith(todayStr))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const pendingGroups = taskGroups.filter((g) => !g.accepted);

  async function loadData() {
    try {
      const [tasksRes, eventsRes, groupsRes] = await Promise.all([
        tasksApi.list({ status: 'pending' }),
        eventsApi.list({ startDate: todayStr, endDate: todayStr }),
        groupsApi.list(),
      ]);

      if (tasksRes.success && tasksRes.data) setTasks(tasksRes.data);
      if (eventsRes.success && eventsRes.data) setEvents(eventsRes.data);
      if (groupsRes.success && groupsRes.data) setTaskGroups(groupsRes.data);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTask(task.id, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    });
    await tasksApi.update(task.id, { status: newStatus });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.greetingName}>{user?.name || 'there'}</Text>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* AI Insight Banner */}
      {aiInsight && (
        <View style={styles.insightBanner}>
          <Feather name="zap" size={16} color={colors.warning} />
          <Text style={styles.insightText}>{aiInsight}</Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => navigation.navigate('CreateTask', {})}
        >
          <Feather name="plus" size={20} color={colors.primary} />
          <Text style={styles.quickActionText}>Add Task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() =>
            navigation.navigate('Main' as any, { screen: 'Assistant' } as any)
          }
        >
          <Feather name="message-circle" size={20} color={colors.accent} />
          <Text style={styles.quickActionText}>Ask AI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() =>
            navigation.navigate('Main' as any, { screen: 'Schedule' } as any)
          }
        >
          <Feather name="calendar" size={20} color={colors.success} />
          <Text style={styles.quickActionText}>Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Smart Group Suggestions */}
      {pendingGroups.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart Suggestions</Text>
          {pendingGroups.slice(0, 2).map((group) => (
            <SmartGroupCard
              key={group.id}
              group={group}
              taskTitles={group.taskIds
                .map((id) => tasks.find((t) => t.id === id)?.title || '')
                .filter(Boolean)}
              onAccept={async (g) => {
                await groupsApi.accept(g.id);
                setTaskGroups(taskGroups.map((tg) =>
                  tg.id === g.id ? { ...tg, accepted: true } : tg
                ));
              }}
              onDismiss={async (g) => {
                await groupsApi.dismiss(g.id);
                setTaskGroups(taskGroups.filter((tg) => tg.id !== g.id));
              }}
              onPress={() => {}}
            />
          ))}
        </View>
      )}

      {/* Today's Schedule */}
      {todayEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {todayEvents.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventTime}>
                <Text style={styles.eventTimeText}>
                  {new Date(event.startTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </Text>
              </View>
              <View style={styles.eventDetails}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.location && (
                  <View style={styles.eventLocation}>
                    <Feather name="map-pin" size={12} color={colors.textMuted} />
                    <Text style={styles.eventLocationText}>{event.location}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Priority Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Priority Tasks</Text>
          <Text style={styles.taskCount}>{todayTasks.length} tasks</Text>
        </View>
        {todayTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={32} color={colors.success} />
            <Text style={styles.emptyText}>You're all caught up!</Text>
          </View>
        ) : (
          todayTasks.slice(0, 5).map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={(t) => navigation.navigate('TaskDetail', { taskId: t.id })}
              onToggleComplete={handleToggleTask}
            />
          ))
        )}
        {todayTasks.length > 5 && (
          <TouchableOpacity
            style={styles.showMore}
            onPress={() =>
              navigation.navigate('Main' as any, { screen: 'Tasks' } as any)
            }
          >
            <Text style={styles.showMoreText}>
              View all {todayTasks.length} tasks
            </Text>
            <Feather name="arrow-right" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  greetingSection: {
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  greetingName: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  dateText: {
    ...typography.bodySmall,
  },
  insightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '15',
    borderColor: colors.warning + '30',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  insightText: {
    ...typography.bodySmall,
    color: colors.warning,
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickActionText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  taskCount: {
    ...typography.caption,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventTime: {
    width: 70,
    justifyContent: 'center',
  },
  eventTimeText: {
    ...typography.label,
    color: colors.primary,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    ...typography.body,
    marginBottom: 2,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventLocationText: {
    ...typography.caption,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.success,
  },
  showMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  showMoreText: {
    ...typography.label,
    color: colors.primary,
  },
});

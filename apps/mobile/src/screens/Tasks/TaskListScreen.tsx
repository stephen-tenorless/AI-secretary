import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Task, TaskCategory } from '@ai-secretary/shared';
import { TASK_CATEGORIES } from '@ai-secretary/shared';
import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useStore } from '../../store/useStore';
import { TaskCard } from '../../components/TaskCard';
import { tasksApi } from '../../services/api';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export function TaskListScreen() {
  const navigation = useNavigation<NavProp>();
  const { tasks, updateTask } = useStore();
  const [activeCategory, setActiveCategory] = useState<TaskCategory | 'all'>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const filteredTasks = tasks
    .filter((t) => {
      if (activeCategory !== 'all' && t.category !== activeCategory) return false;
      if (!showCompleted && t.status === 'completed') return false;
      return true;
    })
    .sort((a, b) => {
      // Completed tasks at the bottom
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      // Then by priority
      const pw = { urgent: 4, high: 3, medium: 2, low: 1 };
      return (pw[b.priority] || 0) - (pw[a.priority] || 0);
    });

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTask(task.id, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    });
    await tasksApi.update(task.id, { status: newStatus });
  };

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <FlatList
        data={[
          { key: 'all' as const, label: 'All', icon: 'grid', color: colors.primary },
          ...TASK_CATEGORIES,
        ]}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterList}
        contentContainerStyle={styles.filterContent}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              activeCategory === item.key && {
                backgroundColor: item.color + '30',
                borderColor: item.color,
              },
            ]}
            onPress={() => setActiveCategory(item.key as TaskCategory | 'all')}
          >
            <Feather
              name={item.icon as any}
              size={14}
              color={activeCategory === item.key ? item.color : colors.textMuted}
            />
            <Text
              style={[
                styles.filterText,
                activeCategory === item.key && { color: item.color },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Toggle Completed */}
      <TouchableOpacity
        style={styles.toggleCompleted}
        onPress={() => setShowCompleted(!showCompleted)}
      >
        <Feather
          name={showCompleted ? 'eye' : 'eye-off'}
          size={14}
          color={colors.textMuted}
        />
        <Text style={styles.toggleText}>
          {showCompleted ? 'Showing completed' : 'Hiding completed'}
        </Text>
      </TouchableOpacity>

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onPress={(t) => navigation.navigate('TaskDetail', { taskId: t.id })}
            onToggleComplete={handleToggleTask}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="inbox" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No tasks</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to add your first task
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTask', {})}
      >
        <Feather name="plus" size={24} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterList: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.transparent,
  },
  filterText: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.textMuted,
  },
  toggleCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggleText: {
    ...typography.caption,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textMuted,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

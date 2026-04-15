import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useStore } from '../../store/useStore';
import { tasksApi } from '../../services/api';
import { getCategoryColor, formatDateTime, getRelativeTime } from '@ai-secretary/shared';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type DetailRoute = RouteProp<RootStackParamList, 'TaskDetail'>;

export function TaskDetailScreen() {
  const route = useRoute<DetailRoute>();
  const navigation = useNavigation();
  const { tasks, updateTask, removeTask } = useStore();

  const task = tasks.find((t) => t.id === route.params.taskId);

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Task not found</Text>
      </View>
    );
  }

  const catColor = getCategoryColor(task.category);

  const handleComplete = async () => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTask(task.id, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    });
    await tasksApi.update(task.id, { status: newStatus });
  };

  const handleDelete = () => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          removeTask(task.id);
          await tasksApi.delete(task.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '20' }]}>
          <Text style={[styles.categoryText, { color: catColor }]}>
            {task.category.toUpperCase()}
          </Text>
        </View>
        <View
          style={[
            styles.priorityBadge,
            task.priority === 'urgent' && { backgroundColor: colors.error + '20' },
          ]}
        >
          <Text
            style={[
              styles.priorityText,
              task.priority === 'urgent' && { color: colors.error },
            ]}
          >
            {task.priority.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{task.title}</Text>
      {task.description && (
        <Text style={styles.description}>{task.description}</Text>
      )}

      {/* Info Section */}
      <View style={styles.infoSection}>
        {task.dueDate && (
          <View style={styles.infoRow}>
            <Feather name="clock" size={16} color={colors.textMuted} />
            <Text style={styles.infoLabel}>Due</Text>
            <Text style={styles.infoValue}>
              {formatDateTime(task.dueDate)} ({getRelativeTime(task.dueDate)})
            </Text>
          </View>
        )}

        {task.location && (
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={colors.textMuted} />
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{task.location}</Text>
          </View>
        )}

        {task.estimatedMinutes && (
          <View style={styles.infoRow}>
            <Feather name="watch" size={16} color={colors.textMuted} />
            <Text style={styles.infoLabel}>Estimated</Text>
            <Text style={styles.infoValue}>{task.estimatedMinutes} min</Text>
          </View>
        )}
      </View>

      {/* Prerequisites */}
      {task.prerequisites.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prerequisites</Text>
          {task.prerequisites.map((prereq, idx) => (
            <View key={idx} style={styles.prereqCard}>
              <Feather name="alert-triangle" size={16} color={colors.warning} />
              <View style={styles.prereqContent}>
                <Text style={styles.prereqText}>{prereq.description}</Text>
                {prereq.hoursBeforeTask && (
                  <Text style={styles.prereqTime}>
                    {prereq.hoursBeforeTask}h before task
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Subtasks */}
      {task.subtasks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Subtasks ({task.subtasks.filter((s) => s.completed).length}/
            {task.subtasks.length})
          </Text>
          {task.subtasks.map((subtask) => (
            <View key={subtask.id} style={styles.subtaskRow}>
              <View
                style={[
                  styles.subtaskCheck,
                  subtask.completed && {
                    backgroundColor: colors.success,
                    borderColor: colors.success,
                  },
                ]}
              >
                {subtask.completed && (
                  <Feather name="check" size={12} color={colors.white} />
                )}
              </View>
              <Text
                style={[
                  styles.subtaskText,
                  subtask.completed && styles.subtaskComplete,
                ]}
              >
                {subtask.title}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Tags */}
      {task.tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tags}>
            {task.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.completeButton,
            task.status === 'completed' && styles.undoButton,
          ]}
          onPress={handleComplete}
        >
          <Feather
            name={task.status === 'completed' ? 'rotate-ccw' : 'check'}
            size={20}
            color={colors.white}
          />
          <Text style={styles.completeText}>
            {task.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Feather name="trash-2" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
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
  notFound: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xxl,
    color: colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    ...typography.caption,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
  },
  priorityText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  infoSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoLabel: {
    ...typography.label,
    width: 80,
  },
  infoValue: {
    ...typography.body,
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  prereqCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  prereqContent: {
    flex: 1,
  },
  prereqText: {
    ...typography.body,
    color: colors.text,
  },
  prereqTime: {
    ...typography.caption,
    color: colors.warning,
    marginTop: 4,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  subtaskCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskText: {
    ...typography.body,
    flex: 1,
  },
  subtaskComplete: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tagText: {
    ...typography.caption,
    color: colors.primaryLight,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  undoButton: {
    backgroundColor: colors.surfaceLight,
  },
  completeText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
  },
});

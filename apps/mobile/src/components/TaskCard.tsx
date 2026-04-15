import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Task } from '@ai-secretary/shared';
import { colors, spacing, borderRadius, typography } from '../utils/theme';

interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
}

const categoryColors: Record<string, string> = {
  home: colors.home,
  work: colors.work,
  personal: colors.personal,
  health: colors.health,
  errands: colors.errands,
  finance: colors.finance,
};

const priorityIcons: Record<string, { icon: string; color: string }> = {
  urgent: { icon: 'alert-circle', color: colors.error },
  high: { icon: 'arrow-up', color: colors.warning },
  medium: { icon: 'minus', color: colors.textSecondary },
  low: { icon: 'arrow-down', color: colors.textMuted },
};

export function TaskCard({ task, onPress, onToggleComplete }: TaskCardProps) {
  const catColor = categoryColors[task.category] || colors.primary;
  const priorityInfo = priorityIcons[task.priority] || priorityIcons.medium;
  const isComplete = task.status === 'completed';

  return (
    <TouchableOpacity
      style={[styles.container, isComplete && styles.completed]}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryBar, { backgroundColor: catColor }]} />

      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => onToggleComplete(task)}
      >
        <View
          style={[
            styles.checkCircle,
            isComplete && { backgroundColor: colors.success, borderColor: colors.success },
          ]}
        >
          {isComplete && <Feather name="check" size={14} color={colors.white} />}
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text
          style={[styles.title, isComplete && styles.titleComplete]}
          numberOfLines={1}
        >
          {task.title}
        </Text>

        <View style={styles.meta}>
          {task.dueDate && (
            <View style={styles.metaItem}>
              <Feather name="clock" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {new Date(task.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          )}

          {task.location && (
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={12} color={colors.textMuted} />
              <Text style={styles.metaText} numberOfLines={1}>
                {task.location}
              </Text>
            </View>
          )}

          {task.subtasks.length > 0 && (
            <View style={styles.metaItem}>
              <Feather name="list" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>
                {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.priority}>
        <Feather
          name={priorityInfo.icon as any}
          size={16}
          color={priorityInfo.color}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  completed: {
    opacity: 0.6,
  },
  categoryBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  checkbox: {
    padding: spacing.md,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.body,
    marginBottom: 4,
  },
  titleComplete: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...typography.caption,
    maxWidth: 100,
  },
  priority: {
    padding: spacing.md,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { TaskGroup } from '@ai-secretary/shared';
import { colors, spacing, borderRadius, typography } from '../utils/theme';

interface SmartGroupCardProps {
  group: TaskGroup;
  taskTitles: string[];
  onAccept: (group: TaskGroup) => void;
  onDismiss: (group: TaskGroup) => void;
  onPress: (group: TaskGroup) => void;
}

export function SmartGroupCard({
  group,
  taskTitles,
  onAccept,
  onDismiss,
  onPress,
}: SmartGroupCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(group)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Feather name="layers" size={20} color={colors.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{group.name}</Text>
          <Text style={styles.subtitle}>
            {group.taskIds.length} tasks - ~{group.estimatedTotalMinutes} min
          </Text>
        </View>
        <View style={styles.badge}>
          <Feather name="zap" size={12} color={colors.warning} />
          <Text style={styles.badgeText}>AI</Text>
        </View>
      </View>

      <Text style={styles.reason}>{group.reason}</Text>

      {group.suggestedRoute && (
        <View style={styles.route}>
          <Feather name="navigation" size={14} color={colors.accent} />
          <Text style={styles.routeText}>{group.suggestedRoute}</Text>
        </View>
      )}

      <View style={styles.tasks}>
        {taskTitles.slice(0, 3).map((title, i) => (
          <View key={i} style={styles.taskItem}>
            <Feather name="circle" size={8} color={colors.primary} />
            <Text style={styles.taskText} numberOfLines={1}>
              {title}
            </Text>
          </View>
        ))}
        {taskTitles.length > 3 && (
          <Text style={styles.moreText}>
            +{taskTitles.length - 3} more
          </Text>
        )}
      </View>

      {!group.accepted && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => onDismiss(group)}
          >
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => onAccept(group)}
          >
            <Feather name="check" size={16} color={colors.white} />
            <Text style={styles.acceptText}>Group Tasks</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '30',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  title: {
    ...typography.h3,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  reason: {
    ...typography.bodySmall,
    marginBottom: spacing.sm,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  routeText: {
    ...typography.bodySmall,
    color: colors.accent,
    flex: 1,
  },
  tasks: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskText: {
    ...typography.bodySmall,
    flex: 1,
  },
  moreText: {
    ...typography.caption,
    marginLeft: spacing.md + spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dismissButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dismissText: {
    ...typography.label,
    color: colors.textMuted,
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  acceptText: {
    ...typography.label,
    color: colors.white,
  },
});

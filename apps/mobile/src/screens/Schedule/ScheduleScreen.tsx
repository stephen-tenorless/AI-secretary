import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ScheduleEvent } from '@ai-secretary/shared';
import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useStore } from '../../store/useStore';

const DAYS_TO_SHOW = 7;

export function ScheduleScreen() {
  const { events, tasks } = useStore();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const start = new Date();
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const selectedDateStr = selectedDate.toISOString().split('T')[0];

  const dayEvents = events
    .filter((e) => e.startTime.startsWith(selectedDateStr))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const dayTasks = tasks.filter(
    (t) =>
      t.status !== 'completed' &&
      t.dueDate?.startsWith(selectedDateStr)
  );

  // Generate time slots for the day view
  const timeSlots = Array.from({ length: 16 }, (_, i) => i + 6); // 6am to 9pm

  return (
    <View style={styles.container}>
      {/* Week Calendar Strip */}
      <View style={styles.weekStrip}>
        {weekDates.map((date) => {
          const dateStr = date.toISOString().split('T')[0];
          const isSelected = dateStr === selectedDateStr;
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          const hasEvents = events.some((e) => e.startTime.startsWith(dateStr));

          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              onPress={() => setSelectedDate(date)}
            >
              <Text
                style={[styles.dayName, isSelected && styles.dayNameSelected]}
              >
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  isToday && !isSelected && styles.dayNumberToday,
                ]}
              >
                {date.getDate()}
              </Text>
              {hasEvents && <View style={styles.eventDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day View */}
      <ScrollView style={styles.dayView} contentContainerStyle={styles.dayViewContent}>
        {/* All-day events */}
        {dayEvents
          .filter((e) => e.isAllDay)
          .map((event) => (
            <View key={event.id} style={styles.allDayEvent}>
              <Feather name="sun" size={14} color={colors.accent} />
              <Text style={styles.allDayText}>{event.title}</Text>
            </View>
          ))}

        {/* Time-based schedule */}
        {timeSlots.map((hour) => {
          const hourStr = hour.toString().padStart(2, '0');
          const slotEvents = dayEvents.filter(
            (e) => !e.isAllDay && new Date(e.startTime).getHours() === hour
          );
          const slotTasks = dayTasks.filter(
            (t) => t.scheduledDate && new Date(t.scheduledDate).getHours() === hour
          );

          return (
            <View key={hour} style={styles.timeSlot}>
              <Text style={styles.timeLabel}>
                {hour === 0
                  ? '12 AM'
                  : hour < 12
                    ? `${hour} AM`
                    : hour === 12
                      ? '12 PM'
                      : `${hour - 12} PM`}
              </Text>
              <View style={styles.timeContent}>
                <View style={styles.timeLine} />
                {slotEvents.map((event) => (
                  <View key={event.id} style={styles.eventBlock}>
                    <View style={styles.eventBlockHeader}>
                      <Text style={styles.eventBlockTitle}>{event.title}</Text>
                      <Text style={styles.eventBlockTime}>
                        {new Date(event.startTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {' - '}
                        {new Date(event.endTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    {event.location && (
                      <View style={styles.eventBlockLocation}>
                        <Feather name="map-pin" size={12} color={colors.textMuted} />
                        <Text style={styles.eventBlockLocationText}>
                          {event.location}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
                {slotTasks.map((task) => (
                  <View key={task.id} style={styles.taskBlock}>
                    <Feather name="check-square" size={14} color={colors.primary} />
                    <Text style={styles.taskBlockTitle}>{task.title}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {dayEvents.length === 0 && dayTasks.length === 0 && (
          <View style={styles.emptyDay}>
            <Feather name="calendar" size={32} color={colors.textMuted} />
            <Text style={styles.emptyDayText}>Nothing scheduled</Text>
            <Text style={styles.emptyDaySubtext}>
              Your AI secretary will suggest tasks to fill this time
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  weekStrip: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  dayCellSelected: {
    backgroundColor: colors.primary + '20',
  },
  dayName: {
    ...typography.caption,
    marginBottom: 4,
  },
  dayNameSelected: {
    color: colors.primary,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  dayNumberSelected: {
    color: colors.primary,
  },
  dayNumberToday: {
    color: colors.accent,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  dayView: {
    flex: 1,
  },
  dayViewContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  allDayEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent + '15',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  allDayText: {
    ...typography.bodySmall,
    color: colors.accent,
    fontWeight: '500',
  },
  timeSlot: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timeLabel: {
    width: 60,
    ...typography.caption,
    textAlign: 'right',
    paddingRight: spacing.sm,
    paddingTop: 2,
  },
  timeContent: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: colors.border + '50',
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  timeLine: {},
  eventBlock: {
    backgroundColor: colors.primary + '20',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  eventBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventBlockTitle: {
    ...typography.body,
    fontWeight: '500',
    flex: 1,
  },
  eventBlockTime: {
    ...typography.caption,
    color: colors.primaryLight,
  },
  eventBlockLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  eventBlockLocationText: {
    ...typography.caption,
  },
  taskBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xs,
  },
  taskBlockTitle: {
    ...typography.bodySmall,
    flex: 1,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyDayText: {
    ...typography.h3,
    color: colors.textMuted,
  },
  emptyDaySubtext: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});

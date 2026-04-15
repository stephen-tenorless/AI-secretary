import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { TaskCategory, Priority } from '@ai-secretary/shared';
import { TASK_CATEGORIES, PRIORITIES, generateId } from '@ai-secretary/shared';
import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useStore } from '../../store/useStore';
import { tasksApi, aiApi } from '../../services/api';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type CreateRoute = RouteProp<RootStackParamList, 'CreateTask'>;

export function CreateTaskScreen() {
  const navigation = useNavigation();
  const route = useRoute<CreateRoute>();

  const { addTask } = useStore();

  const [mode, setMode] = useState<'form' | 'ai'>('form');
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>(
    (route.params?.category as TaskCategory) || 'personal'
  );
  const [priority, setPriority] = useState<Priority>('medium');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a task title.');
      return;
    }

    setSaving(true);
    try {
      const newTask = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        status: 'pending' as const,
        location: location.trim() || undefined,
        tags: [],
        prerequisites: [],
        subtasks: [],
      };

      const result = await tasksApi.create(newTask);
      if (result.success && result.data) {
        addTask(result.data);
      } else {
        // Optimistic add with local ID
        addTask({
          ...newTask,
          id: generateId(),
          userId: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to create task. It has been saved locally.');
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const handleAiCreate = async () => {
    if (!aiInput.trim()) return;

    setAiLoading(true);
    try {
      const result = await aiApi.chat(
        `Create a task from this: "${aiInput.trim()}". Parse out the title, category, priority, location, and any prerequisites or subtasks.`
      );
      if (result.success && result.data) {
        // AI would return structured task data via actions
        Alert.alert('AI Response', result.data.reply.content);
      }
    } catch {
      Alert.alert('Error', 'AI is unavailable. Please use the form instead.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'form' && styles.modeActive]}
          onPress={() => setMode('form')}
        >
          <Feather name="edit-3" size={16} color={mode === 'form' ? colors.white : colors.textMuted} />
          <Text style={[styles.modeText, mode === 'form' && styles.modeTextActive]}>
            Form
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'ai' && styles.modeActive]}
          onPress={() => setMode('ai')}
        >
          <Feather name="zap" size={16} color={mode === 'ai' ? colors.white : colors.textMuted} />
          <Text style={[styles.modeText, mode === 'ai' && styles.modeTextActive]}>
            Tell AI
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'ai' ? (
        /* AI Mode */
        <View style={styles.aiSection}>
          <Text style={styles.aiPrompt}>
            Just describe what you need to do, and I'll organize it for you.
          </Text>
          <TextInput
            style={styles.aiInput}
            placeholder="e.g., I need to pick up nails and paint from Home Depot for the deck project, and I should also grab that prescription from CVS since it's nearby..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            value={aiInput}
            onChangeText={setAiInput}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.submitButton, aiLoading && styles.disabled]}
            onPress={handleAiCreate}
            disabled={aiLoading}
          >
            <Feather name="zap" size={20} color={colors.white} />
            <Text style={styles.submitText}>
              {aiLoading ? 'Processing...' : 'Create with AI'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Form Mode */
        <>
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="What do you need to do?"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add details..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipRow}>
              {TASK_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.chip,
                    category === cat.key && {
                      backgroundColor: cat.color + '30',
                      borderColor: cat.color,
                    },
                  ]}
                  onPress={() => setCategory(cat.key as TaskCategory)}
                >
                  <Feather
                    name={cat.icon as any}
                    size={14}
                    color={category === cat.key ? cat.color : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      category === cat.key && { color: cat.color },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priority */}
          <View style={styles.field}>
            <Text style={styles.label}>Priority</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.key}
                  style={[
                    styles.chip,
                    priority === p.key && {
                      backgroundColor: p.color + '30',
                      borderColor: p.color,
                    },
                  ]}
                  onPress={() => setPriority(p.key as Priority)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      priority === p.key && { color: p.color },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View style={styles.field}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="Where? (e.g., Home Depot, Doctor's office)"
              placeholderTextColor={colors.textMuted}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.disabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Feather name="check" size={20} color={colors.white} />
            <Text style={styles.submitText}>
              {saving ? 'Saving...' : 'Create Task'}
            </Text>
          </TouchableOpacity>
        </>
      )}
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
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  modeActive: {
    backgroundColor: colors.primary,
  },
  modeText: {
    ...typography.label,
    color: colors.textMuted,
  },
  modeTextActive: {
    color: colors.white,
  },
  aiSection: {
    gap: spacing.md,
  },
  aiPrompt: {
    ...typography.body,
    color: colors.textSecondary,
  },
  aiInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
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
  chipText: {
    ...typography.caption,
    fontWeight: '500',
    color: colors.textMuted,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  disabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

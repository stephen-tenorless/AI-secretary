import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { AIMessage } from '@ai-secretary/shared';
import { generateId } from '@ai-secretary/shared';
import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useStore } from '../../store/useStore';
import { aiApi } from '../../services/api';

const QUICK_PROMPTS = [
  { label: 'Daily Briefing', prompt: "What's my day look like?" },
  { label: 'Group Tasks', prompt: 'Can you find tasks I can do together?' },
  { label: 'Reschedule', prompt: 'I need to reschedule something' },
  { label: 'What to do next?', prompt: "What should I work on next?" },
];

export function AIChatScreen() {
  const { chatMessages, addChatMessage } = useStore();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Welcome message if empty
    if (chatMessages.length === 0) {
      addChatMessage({
        id: generateId(),
        role: 'assistant',
        content:
          "Hi! I'm your AI Secretary. I can help you manage tasks, organize your schedule, and remind you about important things. What can I help you with?",
        timestamp: new Date().toISOString(),
      });
    }
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: AIMessage = {
      id: generateId(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    addChatMessage(userMessage);
    setInput('');
    setIsTyping(true);

    try {
      const result = await aiApi.chat(text.trim());

      if (result.success && result.data) {
        addChatMessage({
          ...result.data.reply,
          id: generateId(),
          timestamp: new Date().toISOString(),
        });
      } else {
        addChatMessage({
          id: generateId(),
          role: 'assistant',
          content:
            "I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      addChatMessage({
        id: generateId(),
        role: 'assistant',
        content:
          "I'm currently offline. Your message has been saved and I'll process it when I'm back.",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessage = ({ item }: { item: AIMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {!isUser && (
          <View style={styles.avatarContainer}>
            <Feather name="cpu" size={16} color={colors.primary} />
          </View>
        )}
        <View
          style={[
            styles.messageContent,
            isUser ? styles.userContent : styles.assistantContent,
          ]}
        >
          <Text style={[styles.messageText, isUser && styles.userText]}>
            {item.content}
          </Text>

          {/* AI Actions */}
          {item.actions && item.actions.length > 0 && (
            <View style={styles.actions}>
              {item.actions.map((action, idx) => (
                <View key={idx} style={styles.actionCard}>
                  <Feather
                    name={getActionIcon(action.type)}
                    size={14}
                    color={colors.accent}
                  />
                  <Text style={styles.actionText}>{action.description}</Text>
                  {action.executed ? (
                    <Feather name="check" size={14} color={colors.success} />
                  ) : (
                    <TouchableOpacity style={styles.actionButton}>
                      <Text style={styles.actionButtonText}>Apply</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={chatMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListHeaderComponent={
          chatMessages.length <= 1 ? (
            <View style={styles.quickPrompts}>
              <Text style={styles.quickPromptsTitle}>Quick Actions</Text>
              <View style={styles.quickPromptsGrid}>
                {QUICK_PROMPTS.map((qp) => (
                  <TouchableOpacity
                    key={qp.label}
                    style={styles.quickPrompt}
                    onPress={() => sendMessage(qp.prompt)}
                  >
                    <Text style={styles.quickPromptText}>{qp.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null
        }
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingIndicator}>
          <View style={styles.typingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
          <Text style={styles.typingText}>AI Secretary is thinking...</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask your AI Secretary..."
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          onSubmitEditing={() => sendMessage(input)}
        />
        <TouchableOpacity
          style={[styles.sendButton, !input.trim() && styles.sendDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
        >
          <Feather name="send" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function getActionIcon(type: string): any {
  const icons: Record<string, string> = {
    create_task: 'plus-square',
    update_task: 'edit',
    create_event: 'calendar',
    send_reminder: 'bell',
    suggest_group: 'layers',
    reschedule: 'refresh-cw',
  };
  return icons[type] || 'zap';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messageList: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 4,
  },
  messageContent: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    maxWidth: '100%',
  },
  userContent: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantContent: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    flex: 1,
  },
  messageText: {
    ...typography.body,
    lineHeight: 22,
  },
  userText: {
    color: colors.white,
  },
  timestamp: {
    ...typography.caption,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  actionText: {
    ...typography.bodySmall,
    flex: 1,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  actionButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  quickPrompts: {
    marginBottom: spacing.lg,
  },
  quickPromptsTitle: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  quickPromptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickPrompt: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  quickPromptText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.8 },
  typingText: {
    ...typography.caption,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    backgroundColor: colors.surfaceLight,
  },
});

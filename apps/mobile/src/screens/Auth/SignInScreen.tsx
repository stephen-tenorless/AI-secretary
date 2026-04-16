import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useStore } from '../../store/useStore';
import { setApiToken } from '../../services/api';
import { signInWithGoogle, signInWithApple } from '../../services/oauth';

export function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const { setAuth, setUser } = useStore();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result.success && result.token && result.user) {
        setApiToken(result.token);
        setAuth(result.token);
        setUser({
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferences: {
            wakeUpTime: '07:00',
            sleepTime: '22:00',
            workStartTime: '09:00',
            workEndTime: '17:00',
            preferredReminderLeadMinutes: 15,
            enableSmartGrouping: true,
            enableProactiveReminders: true,
            notificationChannels: ['push'],
          },
          integrations: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        Alert.alert('Error', result.error || 'Google sign-in failed');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithApple();

      if (result.success && result.token && result.user) {
        setApiToken(result.token);
        setAuth(result.token);
        setUser({
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferences: {
            wakeUpTime: '07:00',
            sleepTime: '22:00',
            workStartTime: '09:00',
            workEndTime: '17:00',
            preferredReminderLeadMinutes: 15,
            enableSmartGrouping: true,
            enableProactiveReminders: true,
            notificationChannels: ['push'],
          },
          integrations: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        Alert.alert('Info', result.error || 'Apple sign-in not available');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Feather name="cpu" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>AI Secretary</Text>
        <Text style={styles.subtitle}>Your intelligent personal assistant</Text>
      </View>

      <View style={styles.authButtons}>
        <TouchableOpacity
          style={[styles.oauthButton, styles.googleButton]}
          onPress={handleGoogleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Feather name="chrome" size={20} color={colors.text} />
              <Text style={styles.oauthButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.oauthButton, styles.appleButton]}
            onPress={handleAppleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Feather name="smartphone" size={20} color={colors.white} />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.features}>
        {[
          { icon: 'bell', text: 'Smart reminders with context' },
          { icon: 'layers', text: 'Auto-group related tasks' },
          { icon: 'zap', text: 'AI-powered scheduling' },
        ].map((feature) => (
          <View key={feature.icon} style={styles.featureItem}>
            <Feather
              name={feature.icon as any}
              size={16}
              color={colors.accent}
            />
            <Text style={styles.featureText}>{feature.text}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.disclaimer}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl * 2,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    textAlign: 'center',
  },
  authButtons: {
    gap: spacing.md,
    marginBottom: spacing.xl * 2,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: colors.white,
    borderColor: colors.border,
  },
  appleButton: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  oauthButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  appleButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  features: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  featureText: {
    ...typography.bodySmall,
  },
  disclaimer: {
    ...typography.bodySmall,
    textAlign: 'center',
    color: colors.textMuted,
  },
});

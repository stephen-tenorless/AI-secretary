import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useStore } from '../../store/useStore';
import { authApi, setApiToken } from '../../services/api';

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const { setAuth, setUser } = useStore();

  const handleSubmit = async () => {
    if (!email || !password || (isSignUp && !name)) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const result = isSignUp
        ? await authApi.signUp(email, password, name)
        : await authApi.signIn(email, password);

      if (result.success && result.data) {
        setApiToken(result.data.token);
        setAuth(result.data.token);
        setUser(result.data.user);
      } else {
        Alert.alert('Error', result.error || 'Authentication failed');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Feather name="cpu" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>AI Secretary</Text>
        <Text style={styles.subtitle}>
          Your intelligent personal assistant
        </Text>
      </View>

      <View style={styles.form}>
        {isSignUp && (
          <View style={styles.inputContainer}>
            <Feather name="user" size={20} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Feather name="mail" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Feather name="lock" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.toggleText}>
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.features}>
        {[
          { icon: 'bell', text: 'Smart reminders with context' },
          { icon: 'layers', text: 'Auto-group related tasks' },
          { icon: 'zap', text: 'AI-powered scheduling' },
        ].map((feature) => (
          <View key={feature.icon} style={styles.featureItem}>
            <Feather name={feature.icon as any} size={16} color={colors.accent} />
            <Text style={styles.featureText}>{feature.text}</Text>
          </View>
        ))}
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: spacing.xl,
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
  form: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingLeft: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
  features: {
    gap: spacing.sm,
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
});

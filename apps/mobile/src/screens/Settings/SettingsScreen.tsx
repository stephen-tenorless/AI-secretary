import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../utils/theme';
import { useStore } from '../../store/useStore';
import { setApiToken } from '../../services/api';

export function SettingsScreen() {
  const { user, setAuth, setUser } = useStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          setApiToken(null);
          setAuth(null);
          setUser(null);
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>
        <TouchableOpacity>
          <Feather name="edit-2" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* AI Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Secretary</Text>

        <SettingRow
          icon="zap"
          title="Smart Grouping"
          subtitle="Auto-group tasks you can do together"
          trailing={<Switch value={true} trackColor={{ true: colors.primary }} />}
        />
        <SettingRow
          icon="bell"
          title="Proactive Reminders"
          subtitle="AI-generated context-aware reminders"
          trailing={<Switch value={true} trackColor={{ true: colors.primary }} />}
        />
        <SettingRow
          icon="sun"
          title="Daily Briefing"
          subtitle="Morning summary of your day"
          trailing={<Switch value={true} trackColor={{ true: colors.primary }} />}
        />
        <SettingRow
          icon="mail"
          title="Email Monitoring"
          subtitle="Scan emails for appointments & tasks"
          trailing={<Switch value={false} trackColor={{ true: colors.primary }} />}
        />
      </View>

      {/* Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule Preferences</Text>

        <SettingRow
          icon="sunrise"
          title="Wake Up Time"
          subtitle={user?.preferences?.wakeUpTime || '7:00 AM'}
          trailing={<Feather name="chevron-right" size={18} color={colors.textMuted} />}
        />
        <SettingRow
          icon="moon"
          title="Sleep Time"
          subtitle={user?.preferences?.sleepTime || '10:00 PM'}
          trailing={<Feather name="chevron-right" size={18} color={colors.textMuted} />}
        />
        <SettingRow
          icon="briefcase"
          title="Work Hours"
          subtitle={`${user?.preferences?.workStartTime || '9:00 AM'} - ${user?.preferences?.workEndTime || '5:00 PM'}`}
          trailing={<Feather name="chevron-right" size={18} color={colors.textMuted} />}
        />
        <SettingRow
          icon="globe"
          title="Timezone"
          subtitle={user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
          trailing={<Feather name="chevron-right" size={18} color={colors.textMuted} />}
        />
      </View>

      {/* Integrations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Integrations</Text>

        <SettingRow
          icon="calendar"
          title="Google Calendar"
          subtitle="Not connected"
          trailing={
            <TouchableOpacity style={styles.connectButton}>
              <Text style={styles.connectText}>Connect</Text>
            </TouchableOpacity>
          }
        />
        <SettingRow
          icon="mail"
          title="Gmail"
          subtitle="Not connected"
          trailing={
            <TouchableOpacity style={styles.connectButton}>
              <Text style={styles.connectText}>Connect</Text>
            </TouchableOpacity>
          }
        />
        <SettingRow
          icon="calendar"
          title="Apple Calendar"
          subtitle="Uses device calendar"
          trailing={
            <TouchableOpacity style={styles.connectButton}>
              <Text style={styles.connectText}>Setup</Text>
            </TouchableOpacity>
          }
        />
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <SettingRow
          icon="smartphone"
          title="Push Notifications"
          trailing={<Switch value={true} trackColor={{ true: colors.primary }} />}
        />
        <SettingRow
          icon="mail"
          title="Email Notifications"
          trailing={<Switch value={false} trackColor={{ true: colors.primary }} />}
        />
        <SettingRow
          icon="clock"
          title="Reminder Lead Time"
          subtitle="15 minutes before"
          trailing={<Feather name="chevron-right" size={18} color={colors.textMuted} />}
        />
      </View>

      {/* Account */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Feather name="log-out" size={18} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.version}>AI Secretary v0.1.0</Text>
    </ScrollView>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>
        <Feather name={icon as any} size={18} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {trailing}
    </TouchableOpacity>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  profileName: {
    ...typography.h3,
  },
  profileEmail: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body,
  },
  settingSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  connectButton: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  connectText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error + '10',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  signOutText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

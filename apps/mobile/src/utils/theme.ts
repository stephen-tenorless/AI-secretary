export const colors = {
  // Primary palette - deep indigo
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',

  // Background
  background: '#0F0D23',
  surface: '#1E1B4B',
  surfaceLight: '#2D2A5E',
  card: '#1E1B4B',

  // Text
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Accents
  accent: '#06B6D4',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Categories
  home: '#F97316',
  work: '#3B82F6',
  personal: '#8B5CF6',
  health: '#EF4444',
  errands: '#10B981',
  finance: '#F59E0B',

  // Borders
  border: '#334155',
  borderLight: '#475569',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 22, fontWeight: '600' as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.text },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, color: colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '400' as const, color: colors.textMuted },
  label: { fontSize: 14, fontWeight: '600' as const, color: colors.textSecondary },
};

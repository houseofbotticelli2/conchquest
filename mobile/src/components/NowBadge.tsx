import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

interface NowBadgeProps {
  // 'past' shows when today's window has already elapsed -- same pill
  // weight as 'now', muted instead of accented so it doesn't read as an
  // active/current-window indicator.
  variant?: 'now' | 'past';
}

// Shown on a "Best window" card when the current time falls inside that
// window -- matches the visual weight of the existing "AI-generated" pill
// (StrategyDetail) rather than introducing a louder/different treatment.
export function NowBadge({ variant = 'now' }: NowBadgeProps) {
  const { theme: t } = useTheme();
  const color = variant === 'now' ? t.accent : t.muted;
  const textColor = variant === 'now' ? t.accentDeep : t.muted;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color: textColor }]}>{variant === 'now' ? 'Now' : 'Past'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
});

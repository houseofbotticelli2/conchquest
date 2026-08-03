import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

// Shown on a "Best window" card when the current time falls inside that
// window -- matches the visual weight of the existing "AI-generated" pill
// (StrategyDetail) rather than introducing a louder/different treatment.
export function NowBadge() {
  const { theme: t } = useTheme();
  return (
    <View style={[styles.badge, { borderColor: t.accent }]}>
      <View style={[styles.dot, { backgroundColor: t.accent }]} />
      <Text style={[styles.label, { color: t.accentDeep }]}>Now</Text>
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

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export type BadgeType = 'rare' | 'uncommon' | 'common';

export function Badge({ type }: { type: BadgeType }) {
  const { theme: t } = useTheme();
  const map: Record<BadgeType, { bg: string; fg: string; label: string; border?: string }> = {
    rare: { bg: t.badgeRareBg, fg: t.badgeRareFg, label: 'Rare' },
    uncommon: { bg: t.badgeUncBg, fg: t.badgeUncFg, label: 'Uncommon' },
    common: { bg: t.badgeComBg, fg: t.badgeComFg, label: 'Common', border: t.border },
  };
  const s = map[type];
  return (
    <Text
      style={[
        styles.base,
        { backgroundColor: s.bg, color: s.fg, borderWidth: s.border ? 1 : 0, borderColor: s.border },
      ]}
    >
      {s.label}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fonts.data,
    fontSize: 10,
    letterSpacing: 0.4,
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
});

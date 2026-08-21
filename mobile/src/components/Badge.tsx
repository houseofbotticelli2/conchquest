import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';
import type { BadgeRarity } from '../lib/api';

export type BadgeType = 'rare' | 'uncommon' | 'common';

/**
 * The API's four rarities collapsed to the three the badge draws: "very rare"
 * and "rare" share one badge, and a find with no identified species reads as
 * common.
 *
 * Lives beside BadgeType because it is the mapping *into* it. There were six
 * copies of this across the screens, in three different shapes -- a nullish
 * fallback, a bare passthrough, and an explicit if-chain. They all happened to
 * agree, which is the dangerous kind of duplication: nothing to notice until
 * someone adds a fifth rarity and fixes four of the six.
 *
 * The parameter is nullable so both callers fit: a find's species can be
 * unidentified, a species row's rarity cannot.
 */
export function toBadgeType(rarity: BadgeRarity | null | undefined): BadgeType {
  return rarity === 'very_rare' ? 'rare' : rarity ?? 'common';
}

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

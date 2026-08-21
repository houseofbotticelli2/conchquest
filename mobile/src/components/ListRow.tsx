import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, scoreColor, tabularNums } from '../theme/tokens';

/**
 * The one row used for both beaches and finds (docs/TODO.md #112).
 *
 * Before this there were three interactions for two similar things: a find
 * opened a read view from the Map, the *same* find opened an edit form from My
 * Shells, and a beach expanded an editable panel inline. This collapses them
 * to one: tap to expand read-only, act deliberately from inside the expansion.
 *
 * The row owns none of the accordion state -- the parent passes `expanded` and
 * decides what "one open at a time" means, since only it knows the list.
 */
interface ListRowProps {
  /** Leading slot. A find shows its photo; a beach shows today's score. */
  photoUrl?: string | null;
  score?: number | null;
  /** Fallback glyph when there's no photo (and no score). */
  icon?: string;

  name: string;
  /** Secondary line -- a find's location, a beach's city and distance. */
  sub?: string;
  /** Tertiary, quieter line: dates, counts. */
  meta?: string;
  /** Badges and chips: rarity, condition, private/public, home. */
  chips?: React.ReactNode;

  expanded?: boolean;
  onPress?: () => void;
  /** Read-only detail, shown only while expanded. */
  children?: React.ReactNode;
  /**
   * The one thing you can do with this item, shown at the foot of the
   * expansion: Edit when it's yours, Report/Block when it isn't. Living here
   * rather than on the row means ownership is a property of the expanded view,
   * so the row stays a single tap target with no competing controls.
   */
  action?: React.ReactNode;
}

export function ListRow({
  photoUrl, score, icon, name, sub, meta, chips, expanded, onPress, children, action,
}: ListRowProps) {
  const { theme: t } = useTheme();
  const hasScore = typeof score === 'number';

  return (
    <View style={[styles.wrap, { borderBottomColor: t.borderSoft }]}>
      {/* Pressable, not TouchableOpacity: the row should darken under the
          thumb rather than fade out, matching Btn. A whole row fading reads
          as the content disappearing. */}
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityState={{ expanded: !!expanded }}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.surfaceInset }]}
      >
        <View
          style={[
            styles.lead,
            // The slot's treatment follows its *content*, not its screen -- a
            // score is type that needs a frame, a photo is an image that fills
            // one. Both are consistent everywhere they appear, which is what
            // C6 asks; what it forbids is the same content looking different
            // on different screens, which is what the old per-caller `bg`
            // override was doing.
            hasScore
              ? { borderColor: t.border, borderWidth: 2 }
              : [{ backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha, borderWidth: 1 }, t.shadowRaised],
          ]}
        >
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photo} />
          ) : hasScore ? (
            // The reason a beach is in this list at all is "should I go
            // today?", so the score is the identity of the row, not a detail.
            <Text style={[styles.score, tabularNums, { color: scoreColor(score as number, t) }]}>{score}</Text>
          ) : (
            <Text style={styles.iconText}>{icon ?? '🐚'}</Text>
          )}
        </View>

        <View style={styles.body}>
          <Text style={[styles.name, { color: t.text }]}>{name}</Text>
          {!!meta && <Text style={[styles.meta, { color: t.muted }]}>{meta}</Text>}
          {!!sub && <Text style={[styles.sub, { color: t.muted }]}>{sub}</Text>}
        </View>

        {!!chips && <View style={styles.chips}>{chips}</View>}
      </Pressable>

      {expanded && (
        <View style={styles.expansion}>
          {children}
          {!!action && (
            <View style={styles.actionRow}>
              <View style={styles.actionSlot}>{action}</View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, borderRadius: 8 },
  // borderWidth is set per-branch above, not here -- a transparent score box
  // needs a heavier line than a card that already has a shadow doing the work.
  lead: {
    width: 38, height: 38, borderRadius: 10, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  iconText: { fontSize: 18 },
  score: { fontFamily: fonts.display, fontSize: 16 },
  body: { flex: 1 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  meta: { fontFamily: fonts.data, fontSize: 11, fontWeight: '400' },
  sub: { fontFamily: fonts.data, fontSize: 11 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expansion: { paddingBottom: 12, paddingLeft: 48, gap: 10 },
  // Btn is width:100% by design (it's normally a form's primary action), so
  // the row constrains it -- an expansion's Edit is a modest secondary
  // action, not a full-width call to action.
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  actionSlot: { minWidth: 120, maxWidth: 160 },
});

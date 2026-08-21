import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * A round, raised tap target for a single emoji glyph in a screen header.
 *
 * The beach picker on Shellcast and Map was a bare 📍 sitting in open space,
 * which reads as decoration next to the place name rather than something you
 * can press. The ring matches the `add-circle-outline` glyph used for "add"
 * in My Shells and My Beaches -- an open circle, not a filled chip -- so the
 * header actions across the app read as one family.
 *
 * Sized to sit alongside that 26pt glyph rather than tower over it. The ring
 * itself is under the 44pt touch minimum, so the hitSlop below does the real
 * work -- it's in the top corner, which is awkward to hit accurately.
 */
const SIZE = 28;

export function CircleIconButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { theme: t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={({ pressed }) => [styles.base, { borderColor: t.text }, pressed && styles.pressed]}
    >
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    // Ionicons outline glyphs stroke at 32/512 em, so the add-circle-outline
    // beside this one (rendered at 26) draws a ~1.6pt ring. Matching that
    // exactly is the whole point -- a hair thinner and the two headers look
    // like two different families.
    borderWidth: 1.6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Compresses rather than fades, matching Btn.
  pressed: { opacity: 0.92, transform: [{ scale: 0.94 }] },
  icon: { fontSize: 14 },
});

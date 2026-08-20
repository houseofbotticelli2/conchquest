import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

/**
 * The quiet way out: delete a find, remove a beach.
 *
 * These used to be `<Btn variant="ghost">`, which is a filled inset with a
 * border -- so an irreversible action nobody performs often had more visual
 * presence than Save, the thing you actually came to the screen to do. The
 * real safety is the confirm dialog, not the size of the button.
 *
 * Deliberately muted rather than red. `accentDeep` is the obvious destructive
 * colour, but Eyebrow already uses it for every section label, so on the find
 * screen a red link would sit under four red labels and read as a fifth one.
 * Until that's resolved the word carries the meaning; when it is, this is the
 * single file that changes.
 */
export function DestructiveLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { theme: t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      // Generous, because the text itself is small.
      hitSlop={12}
      style={({ pressed }) => [styles.base, pressed && styles.pressed]}
    >
      <Text style={[styles.label, { color: t.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  pressed: { opacity: 0.6 },
  label: { fontFamily: fonts.body, fontSize: 13 },
});

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * One tappable row inside a SlideUpSheet.
 *
 * Every sheet in the app was building these by hand, and Profile's six sheets
 * had drifted furthest: they passed `borderTopColor` but their style never set
 * `borderTopWidth`, so all ten Settings rows rendered with no divider at all
 * -- "Log out" sat flush against "Delete my account" with nothing between
 * them. The colour was there, doing nothing, in eleven places.
 *
 * A dead style like that is invisible in review and invisible in a typecheck.
 * Owning the divider here is the only way it can't go missing again.
 */
interface SheetRowProps {
  /**
   * Row content. A label alone left-aligns; a label plus a trailing control
   * (checkbox, radio, score) spreads to the edges. Children are laid out
   * directly rather than being wrapped, so a two-child row separates on its
   * own -- an earlier version boxed them together and pinned the control
   * against the label instead of the right edge.
   */
  children: React.ReactNode;
  onPress?: () => void;
}

export function SheetRow({ children, onPress }: SheetRowProps) {
  const { theme: t } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      // Darkens rather than fades, matching ListRow and Btn -- a whole row
      // fading reads as its content disappearing.
      style={({ pressed }) => [
        styles.row,
        { borderTopColor: t.borderSoft },
        pressed && !!onPress && { backgroundColor: t.surfaceInset },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
  },
});

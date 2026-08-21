import React from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

/**
 * The title row at the top of every tab screen.
 *
 * There were five hand-rolled copies of this, and they had quietly drifted:
 * titles at 18 on two screens and 19 on the other three, `alignItems: center`
 * on two and `flex-start` on three, and a minHeight on two so the other three
 * were whatever height their icons happened to be. None of it was deliberate.
 *
 * Two things follow from putting it in one place. The action slot is centred
 * against a fixed-height title block, so buttons line up vertically across
 * screens no matter how tall the glyph is; and the right inset comes from one
 * paddingHorizontal, so they all start from the same edge.
 */

// Tall enough for a title plus a subtitle line. Fixed rather than intrinsic:
// the subtitle is optional, and a header that changes height depending on
// whether a beach happens to have a city is what sent us looking here.
const TITLE_BLOCK_HEIGHT = 38;

interface ScreenHeaderProps {
  title: string;
  /** Second line, when there is one. Its absence doesn't change the height. */
  subtitle?: string | null;
  /** Right-hand controls, laid out in a row and vertically centred. */
  actions?: React.ReactNode;
  /** For callers that need to measure the header to position something below it. */
  onLayout?: (e: LayoutChangeEvent) => void;
}

export function ScreenHeader({ title, subtitle, actions, onLayout }: ScreenHeaderProps) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]} onLayout={onLayout}>
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: t.muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {!!actions && <View style={styles.actions}>{actions}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  // flex so a long title truncates rather than shoving the actions off-screen.
  titleBlock: { flex: 1, minHeight: TITLE_BLOCK_HEIGHT, justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 19 },
  // Explicit lineHeight so the line is the same box whatever it holds.
  subtitle: { fontFamily: fonts.data, fontSize: 11, lineHeight: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});

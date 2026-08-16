import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface CardProps {
  children: React.ReactNode;
  dark?: boolean;
  // Emphasized/hero treatment (surfaceCardHi + shadow.floating) instead of
  // the default resting-card treatment (surfaceCard + shadow.raised) -- use
  // for the single most important card on a screen (e.g. Best Window),
  // not everything.
  hi?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, dark = false, hi = false, style }: CardProps) {
  const { theme: t } = useTheme();
  const shadow = hi ? t.shadowFloating : t.shadowRaised;
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: dark ? t.darkCardBg : hi ? t.surfaceCardHi : t.surfaceCard,
          borderWidth: dark ? 0 : 1,
          borderColor: t.borderSoftAlpha,
        },
        !dark && shadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    padding: 16,
  },
});

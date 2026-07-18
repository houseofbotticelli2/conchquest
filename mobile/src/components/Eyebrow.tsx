import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { theme: t } = useTheme();
  return <Text style={[styles.base, { color: t.accentDeep }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  base: {
    fontFamily: fonts.data,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
});

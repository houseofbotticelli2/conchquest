import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface CardProps {
  children: React.ReactNode;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, dark = false, style }: CardProps) {
  const { theme: t } = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: dark ? t.darkCardBg : t.surface,
          borderWidth: dark ? 0 : 1,
          borderColor: t.border,
        },
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

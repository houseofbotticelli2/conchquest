import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark';

interface BtnProps {
  label: string;
  variant?: Variant;
  onPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function Btn({ label, variant = 'primary', onPress, style, disabled }: BtnProps) {
  const { theme: t } = useTheme();

  const variantStyle: Record<Variant, { background: string; color: string; border?: string }> = {
    primary: { background: t.accent, color: '#fff' },
    secondary: { background: 'transparent', color: t.text, border: t.text },
    ghost: { background: t.surfaceAlt, color: t.text },
    dark: { background: t.text, color: t.bg },
  };
  const v = variantStyle[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        { backgroundColor: v.background, borderWidth: v.border ? 1.5 : 0, borderColor: v.border },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, { color: v.color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: 6,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
  },
  disabled: { opacity: 0.5 },
});

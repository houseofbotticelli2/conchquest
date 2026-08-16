import React from 'react';
import { Text, Pressable, StyleSheet, ViewStyle, StyleProp, GestureResponderEvent } from 'react-native';
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
    // Recessed with a visible edge rather than a flat tan fill -- the old
    // fill read as *disabled* rather than secondary (this is the "Log in"
    // button on Welcome).
    ghost: { background: t.surfaceInset, color: t.text, border: t.borderSoftAlpha },
    dark: { background: t.text, color: t.bg },
  };
  const v = variantStyle[variant];
  // A colored glow under the primary CTA -- the cheapest "premium" signal
  // in the app, and it reuses the accent color rather than introducing a
  // new one. Android's elevation can't tint, so this renders as a plain
  // grey elevation shadow there instead -- acceptable, not worth a fake-
  // glow workaround for a button shadow.
  const primaryGlow = {
    shadowColor: t.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  };

  const pressedGlow = { ...primaryGlow, shadowOpacity: 0.12, shadowRadius: 4, elevation: 1 };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      // Pressable (not TouchableOpacity) so the button can actually
      // compress: the glow collapses and the surface darkens, rather than
      // the whole control just fading out.
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.background, borderWidth: v.border ? 1.5 : 0, borderColor: v.border },
        variant === 'primary' && !disabled && (pressed ? pressedGlow : primaryGlow),
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, { color: v.color }]}>{label}</Text>
    </Pressable>
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
  // Compresses rather than fades -- a card/button should feel pushed in.
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.5 },
});

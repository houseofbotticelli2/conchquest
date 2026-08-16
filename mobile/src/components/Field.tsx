import React, { useState } from 'react';
import { TextInput, TextInputProps, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface FieldProps extends TextInputProps {
  // Whether the field sits *on* a surface (raised -- for form-only screens
  // with no cards to contrast against) or is cut *into* one (recessed, the
  // default, correct whenever the field lives inside a card or sheet).
  raised?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * A TextInput that actually responds to being focused.
 *
 * The app previously had no focused-field affordance at all -- tapping an
 * input changed nothing, so there was no way to tell which field the
 * keyboard was attached to. Focus swaps the soft border for a sea-green one
 * and drops any shadow, so the field reads as active rather than merely
 * present.
 *
 * borderWidth stays constant across states on purpose: animating it would
 * reflow the field (and everything below it) on every focus/blur.
 */
export function Field({ raised = false, style, onFocus, onBlur, ...props }: FieldProps) {
  const { theme: t } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      {...props}
      placeholderTextColor={props.placeholderTextColor ?? t.muted}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      // Caller's `style` comes first so it keeps control of layout (padding,
      // font, height); the state-dependent colors are applied after so focus
      // always wins.
      style={[
        style,
        {
          backgroundColor: raised && !focused ? t.surfaceCardHi : t.surfaceInset,
          borderColor: focused ? t.sea : t.borderSoftAlpha,
          borderWidth: 1.5,
          color: t.text,
        },
        raised && !focused ? t.shadowRaised : null,
      ]}
    />
  );
}

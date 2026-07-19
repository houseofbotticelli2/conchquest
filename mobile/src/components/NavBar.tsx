import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

interface NavBarProps {
  title: string;
  left?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  onLeft?: () => void;
  right?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRight?: () => void;
  rightDisabled?: boolean;
}

export function NavBar({ title, left, leftIcon, onLeft, right, rightIcon, onRight, rightDisabled }: NavBarProps) {
  const { theme: t } = useTheme();
  const rightColor = rightDisabled ? t.muted : t.body;
  return (
    <View style={[styles.base, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
      <TouchableOpacity onPress={onLeft} disabled={!onLeft} style={styles.side}>
        {leftIcon ? (
          <Ionicons name={leftIcon} size={22} color={t.accent} />
        ) : (
          <Text style={[styles.leftLabel, { color: t.accent }]}>{left}</Text>
        )}
      </TouchableOpacity>
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      <TouchableOpacity onPress={onRight} disabled={!onRight || rightDisabled} style={[styles.side, styles.sideRight]}>
        {rightIcon ? (
          <Ionicons name={rightIcon} size={22} color={rightColor} />
        ) : (
          <Text style={[styles.rightLabel, { color: rightColor }]}>{right}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  side: { minWidth: 60 },
  sideRight: { alignItems: 'flex-end' },
  leftLabel: { fontFamily: fonts.body, fontSize: 13 },
  rightLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  title: { fontFamily: fonts.display, fontSize: 15, fontWeight: '600' },
});

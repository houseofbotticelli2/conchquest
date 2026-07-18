import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

interface NavBarProps {
  title: string;
  left?: string;
  onLeft?: () => void;
  right?: string;
  onRight?: () => void;
}

export function NavBar({ title, left, onLeft, right, onRight }: NavBarProps) {
  const { theme: t } = useTheme();
  return (
    <View style={[styles.base, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
      <TouchableOpacity onPress={onLeft} disabled={!onLeft} style={styles.side}>
        <Text style={[styles.leftLabel, { color: t.accent }]}>{left}</Text>
      </TouchableOpacity>
      <Text style={[styles.title, { color: t.text }]}>{title}</Text>
      <TouchableOpacity onPress={onRight} disabled={!onRight} style={[styles.side, styles.sideRight]}>
        <Text style={[styles.rightLabel, { color: t.body }]}>{right}</Text>
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

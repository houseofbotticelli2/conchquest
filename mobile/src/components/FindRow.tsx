import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';
import { Badge, BadgeType } from './Badge';

interface FindRowProps {
  icon: string;
  bg: string;
  name: string;
  sub: string;
  badge: BadgeType;
  onPress?: () => void;
}

export function FindRow({ icon, bg, name, sub, badge, onPress }: FindRowProps) {
  const { theme: t } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={[styles.row, { borderBottomColor: t.borderSoft }]}>
      <View style={[styles.icon, { backgroundColor: bg, borderColor: t.border }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: t.text }]}>{name}</Text>
        <Text style={[styles.sub, { color: t.muted }]}>{sub}</Text>
      </View>
      <Badge type={badge} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  body: { flex: 1 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  sub: { fontFamily: fonts.data, fontSize: 11 },
});

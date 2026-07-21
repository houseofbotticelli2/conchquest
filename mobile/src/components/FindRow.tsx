import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';
import { Badge, BadgeType } from './Badge';

interface FindRowProps {
  icon: string;
  bg: string;
  name: string;
  sub: string;
  badge: BadgeType;
  dateSuffix?: string;
  condition?: string | null;
  notes?: string | null;
  isPrivate?: boolean;
  photoUrl?: string | null;
  onPress?: () => void;
}

export function FindRow({ icon, bg, name, sub, badge, dateSuffix, condition, notes, isPrivate, photoUrl, onPress }: FindRowProps) {
  const { theme: t } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={[styles.row, { borderBottomColor: t.borderSoft }]}>
      <View style={[styles.icon, { backgroundColor: bg, borderColor: t.border }]}>
        {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.photo} /> : <Text style={styles.iconText}>{icon}</Text>}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: t.text }]}>{name}</Text>
        {dateSuffix && <Text style={[styles.dateSuffix, { color: t.muted }]}>{dateSuffix}</Text>}
        {!!sub && <Text style={[styles.sub, { color: t.muted }]}>{sub}</Text>}
        {notes && (
          <Text style={[styles.notes, { color: t.muted }]} numberOfLines={1} ellipsizeMode="tail">
            {notes}
          </Text>
        )}
      </View>
      <View style={styles.badgeRow}>
        {condition && (
          <Text style={[styles.neutralChip, { backgroundColor: t.surfaceAlt, color: t.muted, borderColor: t.border }]}>
            {condition}
          </Text>
        )}
        <Badge type={badge} />
        {isPrivate != null && (
          <Text style={[styles.neutralChip, { backgroundColor: t.surfaceAlt, color: t.muted, borderColor: t.border }]}>
            {isPrivate ? 'Private' : 'Public'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  photo: { width: '100%', height: '100%' },
  body: { flex: 1 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  dateSuffix: { fontFamily: fonts.data, fontSize: 11, fontWeight: '400' },
  sub: { fontFamily: fonts.data, fontSize: 11 },
  notes: { fontFamily: fonts.body, fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  neutralChip: {
    fontFamily: fonts.data,
    fontSize: 9,
    letterSpacing: 0.4,
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

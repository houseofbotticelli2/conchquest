import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Rect, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Eyebrow } from '../../components/Eyebrow';
import { FindRow } from '../../components/FindRow';
import { BadgeType } from '../../components/Badge';
import { MapStackParamList } from '../../navigation/types';
import { listNearbyFinds, NearbyFind } from '../../lib/api';

type Props = NativeStackScreenProps<MapStackParamList, 'Map'>;

const FILTERS = ['All finds', 'Rare', 'Today', 'Mine'];

// Same fixed Sanibel Island location used by Score/Log — no GPS yet.
const DEFAULT_LOCATION = { lat: 26.4615, lon: -82.1867 };

function toBadgeType(rarity: NearbyFind['speciesRarity']): BadgeType {
  if (rarity === 'rare' || rarity === 'very_rare') return 'rare';
  if (rarity === 'uncommon') return 'uncommon';
  return 'common';
}

function formatRelativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `${Math.max(minutes, 1)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function MapScreen({ navigation }: Props) {
  const { theme: t } = useTheme();
  const [finds, setFinds] = useState<NearbyFind[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNearbyFinds(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon)
      .then(setFinds)
      .catch(() => setFinds([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]}>Map</Text>
      </View>
      <ScrollView>
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={{ color: t.muted }}>🔍</Text>
            <Text style={[styles.searchText, { color: t.muted }]}>Search area...</Text>
          </View>
          <View style={[styles.gearBox, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={{ fontSize: 16 }}>⚙</Text>
          </View>
        </View>

        <View style={[styles.mapBox, { borderColor: t.border }]}>
          <Svg viewBox="0 0 292 155" width="100%" height={155}>
            <Rect width={292} height={155} fill="#B8D4E0" />
            <Rect x={20} y={25} width={252} height={110} rx={8} fill="#C8DCC0" />
            <Rect x={30} y={35} width={115} height={75} rx={6} fill="#B8CEB0" />
            <Rect x={155} y={40} width={95} height={65} rx={6} fill="#BCD0B4" />
            <Rect x={0} y={120} width={292} height={35} fill="#A8C0CC" opacity={0.6} />
            <Rect x={8} y={5} width={276} height={20} rx={5} fill="rgba(242,236,228,0.95)" />
            <SvgText x={18} y={18} fontSize={10} fill={t.accent} fontWeight="600">
              Score 78 · Sanibel Island
            </SvgText>
            <Circle cx={108} cy={78} r={13} fill={t.accent} opacity={0.9} />
            <SvgText x={108} y={82} textAnchor="middle" fontSize={10} fill="white">
              3
            </SvgText>
            <Circle
              cx={183}
              cy={63}
              r={10}
              fill={t.accentDeep}
              opacity={0.9}
              onPress={() => navigation.navigate('FindDetail', undefined)}
            />
            <SvgText x={183} y={67} textAnchor="middle" fontSize={9} fill="white">
              1
            </SvgText>
            <Circle cx={148} cy={93} r={9} fill={t.sea} opacity={0.9} />
            <SvgText x={148} y={97} textAnchor="middle" fontSize={9} fill="white">
              2
            </SvgText>
            <Circle cx={73} cy={56} r={9} fill="#D9B36C" opacity={0.9} />
            <SvgText x={73} y={60} textAnchor="middle" fontSize={9} fill="white">
              1
            </SvgText>
            <Circle cx={123} cy={103} r={7} fill={t.text} />
            <Circle cx={123} cy={103} r={13} fill={t.text} opacity={0.2} />
          </Svg>
        </View>

        <View style={styles.filtersRow}>
          {FILTERS.map((label, i) => (
            <Text
              key={label}
              style={[
                styles.filterChip,
                { borderColor: t.border, backgroundColor: i === 0 ? t.navBg : t.surface, color: i === 0 ? t.navText : t.muted },
              ]}
            >
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Eyebrow>Recent finds nearby</Eyebrow>
        </View>
        <View style={styles.list}>
          {loading && <ActivityIndicator color={t.accent} style={{ marginVertical: 12 }} />}
          {!loading && finds.length === 0 && (
            <Text style={[styles.emptyText, { color: t.muted }]}>No community finds nearby yet.</Text>
          )}
          {!loading &&
            finds.map((f) => (
              <FindRow
                key={f.id}
                icon="🐚"
                bg={t.surfaceAlt}
                name={f.speciesName ?? 'Unidentified shell'}
                sub={`~${(f.distanceFeet / 5280).toFixed(1)} mi · ${formatRelativeTime(f.foundAt)}`}
                badge={toBadgeType(f.speciesRarity)}
                onPress={() => navigation.navigate('FindDetail', { findId: f.id })}
              />
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  title: { fontFamily: fonts.display, fontSize: 19, fontWeight: '600' },
  searchRow: { paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', gap: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12 },
  searchText: { fontFamily: fonts.body, fontSize: 13 },
  gearBox: { borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  mapBox: { marginHorizontal: 14, marginBottom: 10, borderRadius: 10, overflow: 'hidden', borderWidth: 1 },
  filtersRow: { paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', gap: 6 },
  filterChip: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4, borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden' },
  sectionHeader: { paddingHorizontal: 14, paddingBottom: 4 },
  list: { paddingHorizontal: 14, paddingBottom: 16 },
  emptyText: { fontFamily: fonts.body, fontSize: 12, paddingVertical: 12 },
});

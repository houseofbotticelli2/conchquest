import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Badge, BadgeType } from '../../components/Badge';
import { LibraryStackParamList } from '../../navigation/types';
import { listSpecies, Species } from '../../lib/api';

function toBadgeType(rarity: Species['rarity']): BadgeType {
  return rarity === 'very_rare' ? 'rare' : rarity;
}

type Props = NativeStackScreenProps<LibraryStackParamList, 'Library'>;

const FILTERS: { label: string; rarity?: 'rare'; region?: string }[] = [
  { label: 'All' },
  { label: 'Rare', rarity: 'rare' },
  { label: 'Gulf', region: 'Gulf' },
  { label: 'Atlantic', region: 'Atlantic' },
];

export function Library({ navigation }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(0);
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpecies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = FILTERS[activeFilter];
      const data = await listSpecies({ search: search || undefined, rarity: filter.rarity, region: filter.region });
      setSpecies(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load species');
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter]);

  useEffect(() => {
    const timeout = setTimeout(fetchSpecies, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [fetchSpecies, search]);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: t.text }]}>Shell Library</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.searchBox, { backgroundColor: t.inputBg, borderColor: t.border }]}>
          <Text style={{ color: t.muted }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search shells..."
            placeholderTextColor={t.muted}
            style={[styles.searchText, { color: t.text }]}
          />
        </View>

        <View style={styles.filtersRow}>
          {FILTERS.map((f, i) => (
            <Text
              key={f.label}
              onPress={() => setActiveFilter(i)}
              style={[
                styles.filterChip,
                { borderColor: t.border, backgroundColor: i === activeFilter ? t.navBg : t.surface, color: i === activeFilter ? t.navText : t.muted },
              ]}
            >
              {f.label}
            </Text>
          ))}
        </View>

        {loading && <ActivityIndicator color={t.accent} style={{ marginVertical: 20 }} />}
        {!loading && error && <Text style={[styles.emptyText, { color: t.accentDeep }]}>{error}</Text>}
        {!loading && !error && species.length === 0 && (
          <Text style={[styles.emptyText, { color: t.muted }]}>No shells match this search.</Text>
        )}
        {!loading &&
          !error &&
          species.map((s) => (
            <View key={s.id} style={[styles.row, { borderBottomColor: t.borderSoft }]}>
              <View style={[styles.icon, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
                <Text style={{ fontSize: 20 }}>🐚</Text>
              </View>
              <View style={styles.body}>
                <Text style={[styles.name, { color: t.text }]}>{s.commonName}</Text>
                <Text style={[styles.sci, { color: t.muted }]}>{s.scientificName}</Text>
                <Badge type={toBadgeType(s.rarity)} />
              </View>
              <Text
                style={[styles.chevron, { color: t.muted }]}
                onPress={() => navigation.navigate('Species', { speciesId: s.id })}
              >
                ›
              </Text>
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  title: { fontFamily: fonts.display, fontSize: 19, fontWeight: '600' },
  content: { paddingHorizontal: 14, paddingBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 10 },
  searchText: { flex: 1, fontFamily: fonts.body, fontSize: 13 },
  emptyText: { fontFamily: fonts.body, fontSize: 12, paddingVertical: 20, textAlign: 'center' },
  filtersRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  filterChip: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4, borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  sci: { fontFamily: fonts.displayItalic, fontSize: 11 },
  chevron: { fontSize: 18 },
});

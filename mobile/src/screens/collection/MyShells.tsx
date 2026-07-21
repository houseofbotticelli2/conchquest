import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { FindRow } from '../../components/FindRow';
import { BadgeType } from '../../components/Badge';
import { CollectionStackParamList } from '../../navigation/types';
import { listMyFinds, Find, FindCondition } from '../../lib/api';

type Props = NativeStackScreenProps<CollectionStackParamList, 'MyShells'>;

function formatFindDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toBadgeType(rarity: Find['speciesRarity']): BadgeType {
  return rarity === 'very_rare' ? 'rare' : rarity ?? 'common';
}

const FILTERS: { label: string; rarity?: 'rare'; condition?: FindCondition; recent?: boolean; private?: boolean }[] = [
  { label: 'All' },
  { label: 'Rare', rarity: 'rare' },
  { label: 'Pristine', condition: 'pristine' },
  { label: 'Good', condition: 'good' },
  { label: 'Fair', condition: 'fair' },
  { label: 'Poor', condition: 'poor' },
  { label: 'Fragment', condition: 'fragment' },
  { label: 'This month', recent: true },
  { label: 'Private', private: true },
];

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function MyShells({ navigation }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const [finds, setFinds] = useState<Find[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      listMyFinds(200)
        .then(setFinds)
        .catch(() => setFinds([]))
        .finally(() => setLoading(false));
    }, [])
  );

  const visibleFinds = useMemo(() => {
    const filter = FILTERS[activeFilter];
    const query = search.trim().toLowerCase();
    return finds.filter((f) => {
      if (query && !(f.speciesName ?? 'unidentified shell').toLowerCase().includes(query)) return false;
      if (filter.rarity && f.speciesRarity !== 'rare' && f.speciesRarity !== 'very_rare') return false;
      if (filter.condition && f.condition !== filter.condition) return false;
      if (filter.recent && !isThisMonth(f.foundAt)) return false;
      if (filter.private && !f.isPrivate) return false;
      return true;
    });
  }, [finds, search, activeFilter]);

  function handleAdd() {
    navigation.getParent()?.getParent()?.dispatch(CommonActions.navigate({ name: 'LogModal' }));
  }

  function handleOpenLibrary() {
    navigation.navigate('Library');
  }

  function handleEdit(find: Find) {
    navigation
      .getParent()
      ?.getParent()
      ?.dispatch(CommonActions.navigate({ name: 'LogModal', params: { screen: 'Log', params: { find } } }));
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: t.text }]}>My Shells</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={handleOpenLibrary}>
            <Ionicons name="book-outline" size={24} color={t.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAdd}>
            <Ionicons name="add-circle-outline" size={26} color={t.text} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.searchBox, { backgroundColor: t.inputBg, borderColor: t.border }]}>
          <Text style={{ color: t.muted }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your shells..."
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
        {!loading && finds.length === 0 && (
          <Text style={[styles.emptyText, { color: t.muted }]}>No shells logged yet — tap + to log your first find.</Text>
        )}
        {!loading && finds.length > 0 && visibleFinds.length === 0 && (
          <Text style={[styles.emptyText, { color: t.muted }]}>No shells match this search.</Text>
        )}
        {!loading &&
          visibleFinds.map((f) => (
            <FindRow
              key={f.id}
              icon="🐚"
              bg={t.surfaceAlt}
              name={f.speciesName ?? 'Unidentified shell'}
              sub=""
              dateSuffix={formatFindDate(f.foundAt)}
              badge={toBadgeType(f.speciesRarity)}
              condition={f.condition}
              notes={f.notes}
              isPrivate={f.isPrivate}
              photoUrl={f.photoUrl}
              onPress={() => handleEdit(f)}
            />
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: fonts.display, fontSize: 19, fontWeight: '600' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  content: { paddingHorizontal: 14, paddingBottom: 16 },
  emptyText: { fontFamily: fonts.body, fontSize: 12, paddingVertical: 20, textAlign: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 10 },
  searchText: { flex: 1, fontFamily: fonts.body, fontSize: 13 },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  filterChip: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4, borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden' },
});

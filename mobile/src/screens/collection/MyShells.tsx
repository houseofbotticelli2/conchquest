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
import { DateRangeSheet } from '../../components/DateRangeSheet';
import { CollectionStackParamList } from '../../navigation/types';
import { listMyFinds, Find } from '../../lib/api';

type Props = NativeStackScreenProps<CollectionStackParamList, 'MyShells'>;

function formatFindDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toBadgeType(rarity: Find['speciesRarity']): BadgeType {
  return rarity === 'very_rare' ? 'rare' : rarity ?? 'common';
}

const FILTERS: { label: string; rarity?: 'rare'; recent?: boolean; private?: boolean }[] = [
  { label: 'All' },
  { label: 'Rare', rarity: 'rare' },
  { label: 'Private', private: true },
  { label: 'This month', recent: true },
];

// A sentinel index one past the end of FILTERS -- lets the date-range chip
// slot into the same mutually-exclusive activeFilter selection as the
// fixed pills above, instead of needing a separate "is date filter active"
// flag threaded through every filter check.
const DATE_FILTER_INDEX = FILTERS.length;

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function formatRangeLabel(from: Date, to: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(from)} – ${fmt(to)}`;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function MyShells({ navigation }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const [finds, setFinds] = useState<Find[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(0);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

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
    const query = search.trim().toLowerCase();
    if (activeFilter === DATE_FILTER_INDEX && dateRange) {
      const fromMs = dateRange.from.getTime();
      const toMs = endOfDay(dateRange.to).getTime();
      return finds.filter((f) => {
        if (query && !(f.speciesName ?? 'unidentified shell').toLowerCase().includes(query)) return false;
        const t = new Date(f.foundAt).getTime();
        return t >= fromMs && t <= toMs;
      });
    }
    const filter = FILTERS[activeFilter];
    return finds.filter((f) => {
      if (query && !(f.speciesName ?? 'unidentified shell').toLowerCase().includes(query)) return false;
      if (filter.rarity && f.speciesRarity !== 'rare' && f.speciesRarity !== 'very_rare') return false;
      if (filter.recent && !isThisMonth(f.foundAt)) return false;
      if (filter.private && !f.isPrivate) return false;
      return true;
    });
  }, [finds, search, activeFilter, dateRange]);

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
              onPress={() => {
                setActiveFilter(i);
                setDateRange(null);
              }}
              style={[
                styles.filterChip,
                { borderColor: t.border, backgroundColor: i === activeFilter ? t.navBg : t.surface, color: i === activeFilter ? t.navText : t.muted },
              ]}
            >
              {f.label}
            </Text>
          ))}
          <TouchableOpacity
            onPress={() => setDateSheetOpen(true)}
            style={[
              styles.filterChip,
              styles.dateChip,
              {
                borderColor: t.border,
                backgroundColor: activeFilter === DATE_FILTER_INDEX ? t.navBg : t.surface,
              },
            ]}
          >
            <Ionicons name="calendar-outline" size={12} color={activeFilter === DATE_FILTER_INDEX ? t.navText : t.muted} />
            {dateRange && (
              <Text style={[styles.dateChipLabel, { color: activeFilter === DATE_FILTER_INDEX ? t.navText : t.muted }]}>
                {formatRangeLabel(dateRange.from, dateRange.to)}
              </Text>
            )}
          </TouchableOpacity>
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
              notes={f.notes}
              isPrivate={f.isPrivate}
              photoUrl={f.photoUrl}
              onPress={() => handleEdit(f)}
            />
          ))}
      </ScrollView>

      <DateRangeSheet
        visible={dateSheetOpen}
        onClose={() => setDateSheetOpen(false)}
        from={dateRange?.from ?? null}
        to={dateRange?.to ?? null}
        onApply={(from, to) => {
          setDateRange({ from, to });
          setActiveFilter(DATE_FILTER_INDEX);
          setDateSheetOpen(false);
        }}
        onClear={() => {
          setDateRange(null);
          setActiveFilter(0);
        }}
      />
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
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateChipLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
});

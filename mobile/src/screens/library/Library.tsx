import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Badge } from '../../components/Badge';
import { LibraryStackParamList } from '../../navigation/types';
import { sampleLibraryShells } from '../../data/sampleData';

type Props = NativeStackScreenProps<LibraryStackParamList, 'Library'>;

const FILTERS = ['All', 'Rare', 'Gulf', 'Atlantic'];

export function Library({ navigation }: Props) {
  const { theme: t } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]}>Shell Library</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.searchBox, { backgroundColor: t.inputBg, borderColor: t.border }]}>
          <Text style={{ color: t.muted }}>🔍</Text>
          <Text style={[styles.searchText, { color: t.muted }]}>Search shells...</Text>
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

        {sampleLibraryShells.map((s) => (
          <View key={s.name} style={[styles.row, { borderBottomColor: t.borderSoft }]}>
            <View style={[styles.icon, { backgroundColor: s.bg ?? t.surfaceAlt, borderColor: t.border }]}>
              <Text style={{ fontSize: 20 }}>🐚</Text>
            </View>
            <View style={styles.body}>
              <Text style={[styles.name, { color: t.text }]}>{s.name}</Text>
              <Text style={[styles.sci, { color: t.muted }]}>{s.sci}</Text>
              <Badge type={s.badge} />
            </View>
            <Text
              style={[styles.chevron, { color: t.muted }]}
              onPress={() => navigation.navigate('Species', undefined)}
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
  searchText: { fontFamily: fonts.body, fontSize: 13 },
  filtersRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  filterChip: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4, borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  sci: { fontFamily: fonts.displayItalic, fontSize: 11 },
  chevron: { fontSize: 18 },
});

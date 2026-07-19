import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { FindRow } from '../../components/FindRow';
import { BadgeType } from '../../components/Badge';
import { CollectionStackParamList } from '../../navigation/types';
import { listMyFinds, Find } from '../../lib/api';

type Props = NativeStackScreenProps<CollectionStackParamList, 'MyShells'>;

function formatFindDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toBadgeType(rarity: Find['speciesRarity']): BadgeType {
  return rarity === 'very_rare' ? 'rare' : rarity ?? 'common';
}

export function MyShells({ navigation }: Props) {
  const { theme: t } = useTheme();
  const [finds, setFinds] = useState<Find[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      listMyFinds(50)
        .then(setFinds)
        .catch(() => setFinds([]))
        .finally(() => setLoading(false));
    }, [])
  );

  function handleAdd() {
    navigation.getParent()?.getParent()?.dispatch(CommonActions.navigate({ name: 'LogModal' }));
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]}>My Shells</Text>
        <TouchableOpacity onPress={handleAdd}>
          <Ionicons name="add-circle-outline" size={26} color={t.text} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading && <ActivityIndicator color={t.accent} style={{ marginVertical: 20 }} />}
        {!loading && finds.length === 0 && (
          <Text style={[styles.emptyText, { color: t.muted }]}>No shells logged yet — tap + to log your first find.</Text>
        )}
        {!loading &&
          finds.map((f) => (
            <FindRow
              key={f.id}
              icon="🐚"
              bg={t.surfaceAlt}
              name={f.speciesName ?? 'Unidentified shell'}
              sub={`${formatFindDate(f.foundAt)}${f.condition ? ` · ${f.condition}` : ''}`}
              badge={toBadgeType(f.speciesRarity)}
              photoUrl={f.photoUrl}
            />
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 19, fontWeight: '600' },
  content: { paddingHorizontal: 14, paddingBottom: 16 },
  emptyText: { fontFamily: fonts.body, fontSize: 12, paddingVertical: 20, textAlign: 'center' },
});

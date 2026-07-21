import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Badge, BadgeType } from '../../components/Badge';
import { NavBar } from '../../components/NavBar';
import { Btn } from '../../components/Btn';
import { getSpecies, Species as SpeciesData } from '../../lib/api';

// Reused across both MapStack and CollectionStack, whose "Species" route shapes
// are identical but are distinct navigator types — a shared prop type here
// would fight one call site or the other, so this takes the minimal shape
// it actually uses instead of a full NativeStackScreenProps union.
interface Props {
  navigation: { goBack: () => void };
  route: { params?: { speciesId?: string } };
}

function toBadgeType(rarity: SpeciesData['rarity']): BadgeType {
  return rarity === 'very_rare' ? 'rare' : rarity;
}

export function Species({ navigation, route }: Props) {
  const { theme: t } = useTheme();
  const speciesId = route.params?.speciesId;
  const [species, setSpecies] = useState<SpeciesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!speciesId) {
      setLoading(false);
      setError('No shell selected.');
      return;
    }
    getSpecies(speciesId)
      .then(setSpecies)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load shell'))
      .finally(() => setLoading(false));
  }, [speciesId]);

  const facts: [string, string][] = species
    ? [
        ['Family', species.family ?? 'Unknown'],
        ['Region', species.regionalOccurrence.length > 0 ? species.regionalOccurrence.join(', ') : 'Unknown'],
        ['Best season', species.seasonality ?? 'Unknown'],
        ['Habitat', species.habitat ?? 'Unknown'],
      ]
    : [];

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar title="Species detail" left="← Library" onLeft={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading && <ActivityIndicator color={t.accent} style={{ marginVertical: 40 }} />}

        {!loading && error && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={[styles.aboutText, { color: t.accentDeep, marginBottom: 12 }]}>{error}</Text>
            <Btn label="Back" variant="ghost" onPress={() => navigation.goBack()} />
          </View>
        )}

        {!loading && species && (
          <>
            <View style={styles.headerRow}>
              <View style={[styles.icon, { backgroundColor: t.iconRare, borderColor: t.border }]}>
                <Text style={{ fontSize: 32 }}>🐚</Text>
              </View>
              <View>
                <Text style={[styles.name, { color: t.text }]}>{species.commonName}</Text>
                <Text style={[styles.sci, { color: t.muted }]}>{species.scientificName}</Text>
                <Badge type={toBadgeType(species.rarity)} />
              </View>
            </View>

            <Card style={styles.factsCard}>
              {facts.map(([k, v], i) => (
                <View key={k} style={[styles.factRow, i < facts.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.borderSoft }]}>
                  <Text style={[styles.factKey, { color: t.muted }]}>{k.toUpperCase()}</Text>
                  <Text style={[styles.factVal, { color: t.text }]}>{v}</Text>
                </View>
              ))}
            </Card>

            {species.description && (
              <Card style={styles.aboutCard}>
                <Eyebrow>About</Eyebrow>
                <Text style={[styles.aboutText, { color: t.body }]}>{species.description}</Text>
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  icon: { width: 66, height: 66, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.displayBold, fontSize: 23, marginBottom: 3 },
  sci: { fontFamily: fonts.displayItalic, fontSize: 11, marginBottom: 8 },
  factsCard: { paddingVertical: 6, paddingHorizontal: 16, marginBottom: 12 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  factKey: { fontFamily: fonts.data, fontSize: 11, letterSpacing: 0.4 },
  factVal: { fontFamily: fonts.body, fontSize: 14 },
  aboutCard: { marginBottom: 12 },
  aboutText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 24 },
  ethicalText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
});

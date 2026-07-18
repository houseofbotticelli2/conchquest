import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Badge } from '../../components/Badge';
import { NavBar } from '../../components/NavBar';
import { sampleSpeciesFacts } from '../../data/sampleData';

// Reused across both MapStack and LibraryStack, whose "Species" route shapes
// are identical but are distinct navigator types — a shared prop type here
// would fight one call site or the other, so this takes the minimal shape
// it actually uses instead of a full NativeStackScreenProps union.
interface Props {
  navigation: { goBack: () => void };
}

export function Species({ navigation }: Props) {
  const { theme: t } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar title="Species detail" left="← Library" onLeft={() => navigation.goBack()} right="🔖" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={[styles.icon, { backgroundColor: t.iconRare, borderColor: t.border }]}>
            <Text style={{ fontSize: 32 }}>🐚</Text>
          </View>
          <View>
            <Text style={[styles.name, { color: t.text }]}>Junonia</Text>
            <Text style={[styles.sci, { color: t.muted }]}>Scaphella junonia</Text>
            <Badge type="rare" />
          </View>
        </View>

        <Card style={styles.factsCard}>
          {sampleSpeciesFacts.map(([k, v], i) => (
            <View
              key={k}
              style={[styles.factRow, i < sampleSpeciesFacts.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.borderSoft }]}
            >
              <Text style={[styles.factKey, { color: t.muted }]}>{k.toUpperCase()}</Text>
              <Text style={[styles.factVal, { color: t.text }]}>{v}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.aboutCard}>
          <Eyebrow>About</Eyebrow>
          <Text style={[styles.aboutText, { color: t.body }]}>
            One of the most sought-after shells on the Gulf Coast. Lives offshore in 30–60 ft of water, washed
            ashore after storms. White with distinctive brown spots. Finding one is considered extremely lucky.
          </Text>
        </Card>

        <Card dark>
          <Eyebrow style={{ color: t.accent }}>🌿 Ethical shelling note</Eyebrow>
          <Text style={[styles.ethicalText, { color: t.muted }]}>
            Only collect empty shells. Live Junonias are protected — if you find one with an animal inside,
            photograph it and leave it in place.
          </Text>
        </Card>
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

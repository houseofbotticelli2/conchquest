import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { NavBar } from '../../components/NavBar';
import { ForecastStackParamList } from '../../navigation/types';
import { sampleFactors } from '../../data/sampleData';

type Props = NativeStackScreenProps<ForecastStackParamList, 'Detail'>;

export function Detail({ navigation }: Props) {
  const { theme: t } = useTheme();
  const toneColor = { sea: t.sea, mid: '#D9B36C', muted: t.muted };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar title="Score breakdown" left="← Back" onLeft={() => navigation.goBack()} right="Sanibel" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.factors}>
          {sampleFactors.map((f) => {
            const color = toneColor[f.tone];
            return (
              <View key={f.label}>
                <View style={styles.factorHeader}>
                  <Text style={[styles.factorLabel, { color: t.text }]}>
                    {f.icon} {f.label}
                  </Text>
                  <Text style={[styles.factorPts, { color }]}>{f.pts} pts</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: t.surfaceAlt }]}>
                  <View style={[styles.barFill, { width: `${f.pct}%`, backgroundColor: color }]} />
                </View>
                <Text style={[styles.factorNote, { color: t.muted }]}>{f.note}</Text>
              </View>
            );
          })}
        </View>

        <Card style={styles.strategyCard}>
          <Eyebrow>Shelling strategy</Eyebrow>
          <Text style={[styles.strategyText, { color: t.body }]}>
            Outgoing tide with offshore wind creates ideal conditions. Swell from the SW suggests productive wrack
            lines along the mid-beach zone. Head out before 7 AM for best results.
          </Text>
        </Card>

        <Card dark>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: t.muted }]}>TOTAL SCORE</Text>
            <Text style={[styles.totalScore, { color: t.accent }]}>78 / 100</Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },
  factors: { gap: 14, marginBottom: 16 },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  factorLabel: { fontFamily: fonts.body, fontSize: 13 },
  factorPts: { fontFamily: fonts.dataSemiBold, fontSize: 13 },
  barTrack: { height: 6, borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
  factorNote: { fontFamily: fonts.data, fontSize: 10, marginTop: 3 },
  strategyCard: { marginBottom: 12 },
  strategyText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: fonts.data, fontSize: 11, letterSpacing: 0.6 },
  totalScore: { fontFamily: fonts.displayBold, fontSize: 28 },
});

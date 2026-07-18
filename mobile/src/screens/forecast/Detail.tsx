import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { NavBar } from '../../components/NavBar';
import { ForecastStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ForecastStackParamList, 'Detail'>;

const FACTOR_ICONS: Record<string, string> = {
  tideLevel: '🌊',
  tidalMovement: '↕️',
  windSpeed: '💨',
  windDirection: '🧭',
  waveHeight: '🏄',
  moonPhase: '🌙',
  timeOfDay: '🕐',
};

export function Detail({ navigation, route }: Props) {
  const { theme: t } = useTheme();
  const { result } = route.params;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar title="Score breakdown" left="← Back" onLeft={() => navigation.goBack()} right="Sanibel" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.factors}>
          {result.factors.map((f) => {
            const pct = f.maxPoints > 0 ? (f.points / f.maxPoints) * 100 : 0;
            const color = pct >= 66 ? t.sea : pct >= 33 ? '#D9B36C' : t.muted;
            return (
              <View key={f.key}>
                <View style={styles.factorHeader}>
                  <Text style={[styles.factorLabel, { color: t.text }]}>
                    {FACTOR_ICONS[f.key] ?? '•'} {f.label}
                  </Text>
                  <Text style={[styles.factorPts, { color }]}>{f.points} pts</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: t.surfaceAlt }]}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                </View>
                <Text style={[styles.factorNote, { color: t.muted }]}>{f.explanation}</Text>
              </View>
            );
          })}
        </View>

        <Card style={styles.strategyCard}>
          <Eyebrow>Shelling strategy</Eyebrow>
          <Text style={[styles.strategyText, { color: t.body }]}>{result.explanation}</Text>
        </Card>

        <Card dark>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: t.muted }]}>TOTAL SCORE</Text>
            <Text style={[styles.totalScore, { color: t.accent }]}>{result.score} / 100</Text>
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

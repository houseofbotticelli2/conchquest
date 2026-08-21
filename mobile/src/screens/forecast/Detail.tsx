import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { NavBar } from '../../components/NavBar';
import { ForecastStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ForecastStackParamList, 'Detail'>;

export function Detail({ navigation, route }: Props) {
  const { theme: t } = useTheme();
  const { result, beachLabel } = route.params;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar title="Score breakdown" left="← Back" onLeft={() => navigation.goBack()} right={beachLabel} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.factors}>
          {result.factors.map((f) => {
            const pct = f.maxPoints > 0 ? (f.points / f.maxPoints) * 100 : 0;
            const color = pct >= 66 ? t.sea : pct >= 33 ? '#D9B36C' : t.muted;
            return (
              // Each factor gets its own card -- seven small cards scan far
              // better than one continuous striped column separated only by
              // hairlines, and it gives the screen depth for free.
              <View
                key={f.key}
                style={[styles.factorCard, { backgroundColor: t.surfaceCard, borderColor: t.borderSoftAlpha }, t.shadowRaised]}
              >
                <View style={styles.factorHeader}>
                  <Text style={[styles.factorLabel, { color: t.text }]}>{f.label}</Text>
                  <Text style={[styles.factorPts, { color, backgroundColor: t.surfaceCardHi }]}>{f.points} pts</Text>
                </View>
                <View style={[styles.barTrack, { backgroundColor: t.surfaceInset }]}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                </View>
                <Text style={[styles.factorNote, { color: t.muted }]}>{f.explanation}</Text>
              </View>
            );
          })}
        </View>

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
  factors: { gap: 10, marginBottom: 16 },
  factorCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  factorLabel: { fontFamily: fonts.body, fontSize: 13 },
  factorPts: { fontFamily: fonts.dataSemiBold, fontSize: 13, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 1, overflow: 'hidden' },
  barTrack: { height: 6, borderRadius: 3 },
  barFill: { height: 6, borderRadius: 3 },
  factorNote: { fontFamily: fonts.data, fontSize: 10, marginTop: 3 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontFamily: fonts.data, fontSize: 11, letterSpacing: 0.6 },
  totalScore: { fontFamily: fonts.displayBold, fontSize: 28 },
});

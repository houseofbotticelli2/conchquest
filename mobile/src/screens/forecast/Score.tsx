import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Btn } from '../../components/Btn';
import { ScoreRing } from '../../components/ScoreRing';
import { ForecastStackParamList } from '../../navigation/types';
import { getScore, ShellingScoreResult } from '../../lib/api';

type Props = NativeStackScreenProps<ForecastStackParamList, 'Score'>;

// No GPS or saved-beach selection wired up yet — fixed to Sanibel Island,
// matching the location label below, until that's built.
const DEFAULT_LOCATION = { lat: 26.4615, lon: -82.1867 };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function Score({ navigation }: Props) {
  const { theme: t } = useTheme();
  const [result, setResult] = useState<ShellingScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getScore(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load score');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  const chips = result
    ? [
        {
          label: !result.conditions.tide
            ? 'TIDE N/A'
            : `TIDE ${result.conditions.tide.movement === 'falling' ? '↓' : result.conditions.tide.movement === 'rising' ? '↑' : '~'}`,
          color: t.sea,
        },
        { label: `WIND ${Math.round(result.conditions.wind.speedMph)}mph`, color: t.sea },
        {
          label: result.conditions.waves.heightFt != null ? `WAVES ${result.conditions.waves.heightFt.toFixed(1)}ft` : 'WAVES N/A',
          color: '#D9B36C',
        },
      ]
    : [];

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView>
        <View style={styles.header}>
          <View>
            <Text style={[styles.place, { color: t.text }]}>Sanibel Island</Text>
            <Text style={[styles.placeSub, { color: t.muted }]}>Fort Myers, FL</Text>
          </View>
          <TouchableOpacity>
            <Text style={{ fontSize: 20 }}>📍</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.centerBox}>
            <ActivityIndicator color={t.accent} />
          </View>
        )}

        {!loading && error && (
          <View style={styles.centerBox}>
            <Text style={[styles.errorText, { color: t.accentDeep }]}>{error}</Text>
            <Btn label="Retry" variant="ghost" onPress={fetchScore} style={{ marginTop: 12 }} />
          </View>
        )}

        {!loading && !error && result && (
          <>
            <View style={styles.ringWrap}>
              <ScoreRing score={result.score} size={150} />
              <Text style={[styles.confidence, { color: t.muted }]}>Confidence: {result.confidence}</Text>
            </View>

            <Card style={styles.windowCard}>
              <Eyebrow>Best window today</Eyebrow>
              {result.bestWindow ? (
                <>
                  <Text style={[styles.windowTime, { color: t.text }]}>
                    {formatTime(result.bestWindow.start)} – {formatTime(result.bestWindow.end)}
                  </Text>
                  <Text style={[styles.windowNote, { color: t.sea }]}>{result.bestWindow.reason}</Text>
                </>
              ) : (
                <Text style={[styles.windowNote, { color: t.muted }]}>No daylight low tide in today's forecast window.</Text>
              )}
            </Card>

            <View style={styles.chipsRow}>
              {chips.map((c) => (
                <Text key={c.label} style={[styles.chip, { backgroundColor: t.surface, borderColor: t.border, color: c.color }]}>
                  {c.label}
                </Text>
              ))}
            </View>

            <View style={styles.footer}>
              <Btn label="See score breakdown" onPress={() => navigation.navigate('Detail', { result })} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  place: { fontFamily: fonts.display, fontSize: 18, fontWeight: '600' },
  placeSub: { fontFamily: fonts.data, fontSize: 11 },
  centerBox: { paddingVertical: 60, alignItems: 'center', paddingHorizontal: 24 },
  errorText: { fontFamily: fonts.body, fontSize: 14, textAlign: 'center' },
  ringWrap: { paddingVertical: 12, alignItems: 'center' },
  confidence: { fontFamily: fonts.data, fontSize: 11, marginTop: 8, letterSpacing: 0.4, textTransform: 'uppercase' },
  windowCard: { marginHorizontal: 16, marginBottom: 12 },
  windowTime: { fontFamily: fonts.display, fontSize: 20, fontWeight: '600', marginBottom: 2 },
  windowNote: { fontFamily: fonts.data, fontSize: 12 },
  chipsRow: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip: {
    fontFamily: fonts.data,
    fontSize: 10,
    letterSpacing: 0.4,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  footer: { paddingHorizontal: 16, paddingBottom: 20 },
});

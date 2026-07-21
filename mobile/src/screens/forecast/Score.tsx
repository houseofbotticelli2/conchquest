import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, scoreColor } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Btn } from '../../components/Btn';
import { ScoreRing } from '../../components/ScoreRing';
import { SlideUpSheet } from '../../components/SlideUpSheet';
import { ForecastStackParamList } from '../../navigation/types';
import { getScore, listSavedLocations, ShellingScoreResult, SavedLocation } from '../../lib/api';

type Props = NativeStackScreenProps<ForecastStackParamList, 'Score'>;

// No GPS wired up yet — fixed to Sanibel Island until a beach is picked.
const DEFAULT_LOCATION = { lat: 26.4615, lon: -82.1867 };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isTomorrow(iso: string): boolean {
  return new Date(iso).toDateString() !== new Date().toDateString();
}

export function Score({ navigation }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<ShellingScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [beaches, setBeaches] = useState<SavedLocation[]>([]);
  const [selectedBeach, setSelectedBeach] = useState<SavedLocation | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      listSavedLocations()
        .then(setBeaches)
        .catch(() => setBeaches([]));
    }, [])
  );

  const location = selectedBeach ? selectedBeach.location : DEFAULT_LOCATION;

  const fetchScore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getScore(location.lat, location.lon);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load score');
    } finally {
      setLoading(false);
    }
  }, [location.lat, location.lon]);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  function selectBeach(beach: SavedLocation) {
    setSelectedBeach(beach);
    setPickerOpen(false);
  }

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

  const nextLowTide = result?.conditions.tide?.nextEvents.find((e) => e.type === 'low') ?? null;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View>
            <Text style={[styles.place, { color: t.text }]}>{selectedBeach ? selectedBeach.name : 'Sanibel Island'}</Text>
            {(selectedBeach ? selectedBeach.isHome : true) && (
              <Text style={[styles.placeSub, { color: t.muted }]}>{selectedBeach ? 'Home beach' : 'Fort Myers, FL'}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => setPickerOpen(true)}>
            <Text style={{ fontSize: 20 }}>📍</Text>
          </TouchableOpacity>
        </View>

        <SlideUpSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a beach">
          {beaches.length === 0 && (
            <Text style={[styles.emptyPicker, { color: t.muted }]}>No saved beaches yet.</Text>
          )}
          {beaches.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={[styles.pickerRow, { borderTopColor: t.borderSoft }]}
              onPress={() => selectBeach(b)}
            >
              <View style={styles.pickerRowNameLine}>
                <Text style={[styles.pickerRowName, { color: t.text }]}>{b.name}</Text>
                {b.isHome && (
                  <Text style={[styles.homeBadge, { backgroundColor: t.surfaceAlt, color: t.text, borderColor: t.border }]}>
                    HOME
                  </Text>
                )}
              </View>
              <Text style={[styles.pickerRowScore, { color: scoreColor(b.score, t) }]}>{b.score}</Text>
            </TouchableOpacity>
          ))}
        </SlideUpSheet>

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
              {nextLowTide && (
                <Text style={[styles.windowNote, { color: t.muted, marginTop: 6 }]}>
                  Next low tide: {formatTime(nextLowTide.time)}
                  {isTomorrow(nextLowTide.time) ? ' (tomorrow)' : ''}
                </Text>
              )}
            </Card>

            <Card style={styles.windowCard}>
              <Eyebrow>Today's conditions</Eyebrow>
              <Text style={[styles.windowTime, { color: t.text }]}>
                {result.conditions.weather.tempF != null ? `${Math.round(result.conditions.weather.tempF)}°F` : '--°F'}
                {result.conditions.weather.conditions ? ` · ${result.conditions.weather.conditions}` : ''}
              </Text>
              <Text style={[styles.windowNote, { color: t.muted }]}>
                Sunrise {formatTime(result.conditions.weather.sunrise)} · Sunset {formatTime(result.conditions.weather.sunset)}
              </Text>
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
  emptyPicker: { fontFamily: fonts.body, fontSize: 12, paddingVertical: 12 },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  pickerRowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerRowName: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
  pickerRowScore: { fontFamily: fonts.displayBold, fontSize: 18 },
  homeBadge: {
    fontFamily: fonts.data,
    fontSize: 9,
    letterSpacing: 0.4,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

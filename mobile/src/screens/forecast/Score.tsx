import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, scoreColor } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Btn } from '../../components/Btn';
import { ScoreRing } from '../../components/ScoreRing';
import { SlideUpSheet } from '../../components/SlideUpSheet';
import { CircleIconButton } from '../../components/CircleIconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { NowBadge } from '../../components/NowBadge';
import { ForecastStackParamList } from '../../navigation/types';
import { getMultiDayScore, MultiDayScoreEntry } from '../../lib/api';
import { useBeachContext } from '../../hooks/useBeachContext';
import {
  formatTime,
  formatTimeShort,
  relativeDaySuffix,
  isWithinWindow,
  isPastWindow,
  daylightNote,
  bestWindowLightWarning,
  dayChipLabel,
  daySentenceLabel,
} from '../../lib/forecastFormat';

type Props = NativeStackScreenProps<ForecastStackParamList, 'Score'>;

// Tapping the score ring now opens the breakdown directly -- flip this back
// to true to bring back the explicit button underneath the chips instead.
const SHOW_BREAKDOWN_BUTTON = false;

// Falls back to Sanibel Island if location permission is denied and no
// beach is nearby/selected.
const DEFAULT_LOCATION = { lat: 26.4615, lon: -82.1867, label: 'Sanibel Island' };

export function Score({ navigation, route }: Props) {
  const { theme: t } = useTheme();
  const [days, setDays] = useState<MultiDayScoreEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { beaches, selectedBeach, location, titleLabel, subLabel, pickerOpen, setPickerOpen, selectBeach, selectBeachById } =
    useBeachContext(DEFAULT_LOCATION);

  // A tapped beach-alert push notification carries the beach that triggered
  // it -- jump straight to that beach instead of leaving auto-detect in charge.
  const alertBeachId = route.params?.beachId;
  useEffect(() => {
    if (alertBeachId && beaches.some((b) => b.id === alertBeachId)) {
      selectBeachById(alertBeachId);
      navigation.setParams({ beachId: undefined });
    }
  }, [alertBeachId, beaches]);

  const fetchDays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMultiDayScore(location.lat, location.lon);
      setDays(data);
      setSelectedIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load score');
    } finally {
      setLoading(false);
    }
  }, [location.lat, location.lon]);

  // Refetch on every focus, not just mount/location-change -- otherwise a
  // preference toggled elsewhere (e.g. "Daylight hours only" in Settings)
  // never shows up here, since this screen stays mounted across tab
  // switches and a plain useEffect wouldn't re-run on returning to it.
  useFocusEffect(
    useCallback(() => {
      fetchDays();
    }, [fetchDays])
  );

  const result = days[selectedIndex] ?? null;
  const isToday = selectedIndex === 0;
  const bestIndex = days.length > 0 ? days.reduce((best, d, i) => (d.score > days[best].score ? i : best), 0) : -1;

  const chips = result
    ? [
        {
          // Scoring is anchored to this day's low tide, so currentLevelFt
          // here is effectively the predicted low's height, not an arbitrary
          // instant's -- a movement arrow would show "~" (slack) on almost
          // every day now, since every day is scored right at its own low.
          label:
            !result.conditions.tide || result.conditions.tide.currentLevelFt === null
              ? 'TIDE N/A'
              : `TIDE ${result.conditions.tide.currentLevelFt.toFixed(1)}ft`,
          color: t.sea,
          unavailable: false,
        },
        {
          label: `WIND ${Math.round(result.conditions.wind.speedMph)}mph ${result.conditions.wind.directionCompass}`,
          color: t.sea,
          unavailable: false,
        },
        // No wave forecast exists for future days (only a live buoy reading
        // for today) -- gray those out instead of showing a fabricated N/A
        // that looks the same as every other chip.
        !isToday
          ? { label: 'WAVES N/A', color: t.muted, unavailable: true }
          : {
              label: result.conditions.waves.heightFt != null ? `WAVES ${result.conditions.waves.heightFt.toFixed(1)}ft` : 'WAVES N/A',
              color: '#D9B36C',
              unavailable: false,
            },
      ]
    : [];

  const nextLowTide = result?.conditions.tide?.nextEvents.find((e) => e.type === 'low') ?? null;
  const sentenceLabel = result ? daySentenceLabel(selectedIndex, result.date) : '';
  const windowIsNow = result?.bestWindow ? isWithinWindow(result.bestWindow.start, result.bestWindow.end) : false;
  const windowIsPast = result?.bestWindow ? isPastWindow(result.bestWindow.end) : false;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView>
        <ScreenHeader
          title={titleLabel}
          subtitle={subLabel}
          actions={
            <CircleIconButton icon="📍" onPress={() => setPickerOpen(true)} accessibilityLabel="Choose a beach" />
          }
        />

        <SlideUpSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a beach">
          <TouchableOpacity style={[styles.pickerRow, { borderTopColor: t.borderSoft }]} onPress={() => selectBeach(null)}>
            <Text style={[styles.pickerRowName, { color: t.text }]}>Current Location</Text>
          </TouchableOpacity>
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
                {b.isFavorite && (
                  <Text style={[styles.homeBadge, { backgroundColor: t.surfaceInset, color: t.text, borderColor: t.borderSoftAlpha }]}>
                    ★
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
            <Btn label="Retry" variant="ghost" onPress={fetchDays} style={{ marginTop: 12 }} />
          </View>
        )}

        {!loading && !error && days.length > 0 && (
          <View style={styles.dayStripWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayStrip}
              style={styles.dayScrollView}
            >
              {days.map((d, i) => {
                const selected = i === selectedIndex;
                const isBest = i === bestIndex;
                return (
                  <TouchableOpacity
                    key={d.date}
                    onPress={() => setSelectedIndex(i)}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: selected ? t.text : t.surfaceCard,
                        borderColor: selected ? t.text : isBest ? t.sea : t.borderSoftAlpha,
                      },
                      selected ? t.shadowFloating : undefined,
                    ]}
                  >
                    {isBest && (
                      <Text style={[styles.bestBadge, { backgroundColor: t.accent }]}>Best</Text>
                    )}
                    <Text style={[styles.dayChipLabel, { color: selected ? t.bg : t.muted }]}>
                      {dayChipLabel(i, d.date).toUpperCase()}
                    </Text>
                    <Text style={[styles.dayChipScore, { color: selected ? t.bg : scoreColor(d.score, t) }]}>{d.score}</Text>
                    <Text style={[styles.dayChipWindow, { color: selected ? t.bg : t.muted, opacity: selected ? 0.8 : 1 }]}>
                      {d.bestWindow ? formatTimeShort(d.bestWindow.lowTideTime) : '—'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {!loading && !error && result && (
          <>
            <TouchableOpacity
              style={styles.ringWrap}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Detail', { result, beachLabel: titleLabel })}
              accessibilityRole="button"
              accessibilityLabel="See score breakdown"
            >
              {/* The hero number gets a real container -- a floating white
                  disc -- rather than sitting directly on the page. */}
              <View style={[styles.ringDisc, { backgroundColor: t.surfaceCardHi }, t.shadowFloating]}>
                <ScoreRing score={result.score} size={150} lowTideTime={nextLowTide ? formatTime(nextLowTide.time) : undefined} />
              </View>
            </TouchableOpacity>

            <View style={styles.chipsRow}>
              {chips.map((c) => (
                <Text
                  key={c.label}
                  style={[
                    styles.chip,
                    { backgroundColor: t.surfaceCardHi, borderColor: c.unavailable ? t.muted : t.borderSoftAlpha, color: c.color },
                    c.unavailable && styles.chipUnavailable,
                  ]}
                >
                  {c.label}
                </Text>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('StrategyDetail', {
                  result,
                  dayOffset: selectedIndex,
                  dayLabel: sentenceLabel,
                  isToday,
                  beachLabel: titleLabel,
                })
              }
            >
              <Card hi style={styles.windowCard}>
                <View style={styles.windowHeader}>
                  <Eyebrow style={styles.windowEyebrow}>Best window {sentenceLabel}</Eyebrow>
                  {windowIsNow && <NowBadge />}
                  {!windowIsNow && windowIsPast && <NowBadge variant="past" />}
                </View>
                {result.bestWindow ? (
                  <>
                    <Text style={[styles.windowTime, { color: t.text }]}>
                      {formatTime(result.bestWindow.start)} – {formatTime(result.bestWindow.end)}
                    </Text>
                    <Text style={[styles.windowNote, { color: t.sea }]}>
                      {result.bestWindow.reason}
                      {!result.bestWindow.isDaylight
                        ? ` ${bestWindowLightWarning(
                            result.bestWindow.start,
                            result.bestWindow.end,
                            result.conditions.weather.sunrise,
                            result.conditions.weather.sunset
                          )}`
                        : ''}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.windowTime, { color: t.text }]}>No shelling window {isToday ? 'today' : sentenceLabel}</Text>
                    <Text style={[styles.windowNote, { color: t.sea }]}>
                      {result.restrictShellingToDaylight
                        ? `${isToday ? "Today's" : `${sentenceLabel}'s`} low tide falls at night, outside daylight hours.`
                        : `No low tide data available for ${isToday ? 'today' : sentenceLabel}.`}
                    </Text>
                  </>
                )}
                {nextLowTide && (
                  <Text style={[styles.windowNote, { color: t.muted, marginTop: 6 }]}>
                    Low tide: {formatTime(nextLowTide.time)}
                    {relativeDaySuffix(nextLowTide.time, result.date)}
                    {result &&
                      result.restrictShellingToDaylight &&
                      (() => {
                        const note = daylightNote(nextLowTide.time, result.conditions.weather.sunrise, result.conditions.weather.sunset);
                        return note ? ` — ${note}` : '';
                      })()}
                  </Text>
                )}
                {result.altLowTide && new Date(result.altLowTide.time).getTime() > Date.now() && (
                  <Text style={[styles.windowNote, { color: t.muted, marginTop: 2 }]}>
                    Alt low tide: {formatTime(result.altLowTide.time)}
                    {relativeDaySuffix(result.altLowTide.time, result.date)}
                  </Text>
                )}
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate('ConditionsDetail', {
                  result,
                  dayOffset: selectedIndex,
                  dayLabel: sentenceLabel,
                  beachLabel: titleLabel,
                })
              }
            >
              <Card style={styles.windowCard}>
                <Eyebrow>Conditions {sentenceLabel}</Eyebrow>
                <Text style={[styles.windowTime, { color: t.text }]}>
                  {result.conditions.weather.tempF != null ? `${Math.round(result.conditions.weather.tempF)}°F` : '--°F'}
                  {result.conditions.weather.conditions ? ` · ${result.conditions.weather.conditions}` : ''}
                </Text>
                <Text style={[styles.windowNote, { color: t.muted }]}>
                  Sunrise {formatTime(result.conditions.weather.sunrise)} · Sunset {formatTime(result.conditions.weather.sunset)}
                </Text>
              </Card>
            </TouchableOpacity>

            {SHOW_BREAKDOWN_BUTTON && (
              <View style={styles.footer}>
                <Btn label="See score breakdown" onPress={() => navigation.navigate('Detail', { result, beachLabel: titleLabel })} />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Explicit lineHeight + minHeight so this line occupies the same space
  // whether it holds a city or nothing. A whitespace-only Text collapses,
  // and natural metrics differ by half a pixel between the two, so neither
  // a placeholder space nor the default line box is enough on its own.
  centerBox: { paddingVertical: 60, alignItems: 'center', paddingHorizontal: 24 },
  errorText: { fontFamily: fonts.body, fontSize: 14, textAlign: 'center' },
  dayStripWrap: { marginTop: 2, marginBottom: 4 },
  dayScrollView: { flexGrow: 0 },
  // flexGrow: 1 + justifyContent: 'center' centers the chips when they fit
  // within the screen width (the common case), while still scrolling
  // normally left-to-right if they ever don't (a wider font size, more days).
  dayStrip: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingTop: 9, gap: 8 },
  dayChip: {
    width: 60,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 9,
    paddingBottom: 8,
    alignItems: 'center',
  },
  dayChipLabel: { fontFamily: fonts.data, fontSize: 9.5, letterSpacing: 0.4 },
  dayChipScore: { fontFamily: fonts.displayBold, fontSize: 21, marginTop: 3, lineHeight: 24 },
  dayChipWindow: { fontFamily: fonts.data, fontSize: 8.5, marginTop: 4 },
  bestBadge: {
    position: 'absolute',
    top: -7,
    right: 6,
    color: '#fff',
    fontFamily: fonts.data,
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  chipUnavailable: { borderStyle: 'dashed', opacity: 0.75 },
  ringWrap: { paddingVertical: 12, alignItems: 'center' },
  ringDisc: { width: 186, height: 186, borderRadius: 93, alignItems: 'center', justifyContent: 'center' },
  windowCard: { marginHorizontal: 16, marginBottom: 12 },
  windowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  windowEyebrow: { marginBottom: 0 },
  windowTime: { fontFamily: fonts.display, fontSize: 20, marginBottom: 2 },
  windowNote: { fontFamily: fonts.data, fontSize: 12 },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  chip: {
    fontFamily: fonts.data,
    fontSize: 10,
    letterSpacing: 0.4,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
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

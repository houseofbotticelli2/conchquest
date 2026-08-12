import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { NavBar } from '../../components/NavBar';
import { NowBadge } from '../../components/NowBadge';
import { ForecastStackParamList } from '../../navigation/types';
import { formatTime, relativeDaySuffix, isWithinWindow, isPastWindow, daylightNote, bestWindowLightWarning } from '../../lib/forecastFormat';
import { getStrategy } from '../../lib/api';

// Generous relative to the backend's own 5s OpenAI timeout -- this only
// trips if the network/request itself hangs, not the normal generate-then-
// fallback path (which the backend already bounds and always resolves).
const STRATEGY_TIMEOUT_MS = 8000;

type Props = NativeStackScreenProps<ForecastStackParamList, 'StrategyDetail'>;

export function StrategyDetail({ navigation, route }: Props) {
  const { theme: t } = useTheme();
  const { result, dayOffset, dayLabel, isToday, beachLabel } = route.params;
  const nextLowTide = result.conditions.tide?.nextEvents.find((e) => e.type === 'low') ?? null;
  const windowIsNow = result.bestWindow ? isWithinWindow(result.bestWindow.start, result.bestWindow.end) : false;
  const windowIsPast = result.bestWindow ? isPastWindow(result.bestWindow.end) : false;

  const [strategyText, setStrategyText] = useState<string | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Pre-format the window in the device's local time -- the backend can't
    // reliably localize a raw ISO timestamp to the beach's timezone, so it
    // must receive the same human-readable strings already shown on screen.
    const bestWindowStart = result.bestWindow ? formatTime(result.bestWindow.start) : null;
    const bestWindowEnd = result.bestWindow ? formatTime(result.bestWindow.end) : null;

    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), STRATEGY_TIMEOUT_MS));
    Promise.race([
      getStrategy(result, beachLabel, dayLabel, bestWindowStart, bestWindowEnd, dayOffset, windowIsPast),
      timeout,
    ])
      .then((res) => {
        if (cancelled) return;
        setStrategyText(res ? res.strategy : result.explanation);
      })
      .catch(() => {
        if (cancelled) return;
        setStrategyText(result.explanation);
      })
      .finally(() => {
        if (!cancelled) setLoadingStrategy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [result, beachLabel, dayLabel, dayOffset]);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar title="Shelling strategy" left="← Back" onLeft={() => navigation.goBack()} right={beachLabel} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.windowCard}>
          <View style={styles.windowHeader}>
            <Eyebrow style={styles.windowEyebrow}>Best window {dayLabel}</Eyebrow>
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
              <Text style={[styles.windowTime, { color: t.text }]}>No shelling window {isToday ? 'today' : dayLabel}</Text>
              <Text style={[styles.windowNote, { color: t.sea }]}>
                {result.restrictShellingToDaylight
                  ? `${isToday ? "Today's" : `${dayLabel}'s`} low tide falls at night, outside daylight hours.`
                  : `No low tide data available for ${isToday ? 'today' : dayLabel}.`}
              </Text>
            </>
          )}
          {nextLowTide && (
            <Text style={[styles.windowNote, { color: t.muted, marginTop: 6 }]}>
              Low tide: {formatTime(nextLowTide.time)}
              {relativeDaySuffix(nextLowTide.time, result.date)}
              {result.restrictShellingToDaylight &&
                (() => {
                  const note = daylightNote(nextLowTide.time, result.conditions.weather.sunrise, result.conditions.weather.sunset);
                  return note ? ` — ${note}` : '';
                })()}
            </Text>
          )}
        </Card>

        <Card style={styles.strategyCard}>
          <Eyebrow>Shelling strategy</Eyebrow>
          {loadingStrategy ? (
            <ActivityIndicator color={t.accent} style={styles.strategyLoading} />
          ) : (
            <Text style={[styles.strategyText, { color: t.body }]}>{strategyText}</Text>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 24, gap: 12 },
  windowCard: {},
  windowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  windowEyebrow: { marginBottom: 0 },
  windowTime: { fontFamily: fonts.display, fontSize: 20, fontWeight: '600', marginBottom: 2 },
  windowNote: { fontFamily: fonts.data, fontSize: 12 },
  strategyCard: {},
  strategyLoading: { marginTop: 10, alignSelf: 'flex-start' },
  strategyText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
});

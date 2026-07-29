import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { NavBar } from '../../components/NavBar';
import { ForecastStackParamList } from '../../navigation/types';
import { formatTime, isTomorrow, daylightNote } from '../../lib/forecastFormat';
import { getStrategy } from '../../lib/api';

// Generous relative to the backend's own 5s OpenAI timeout -- this only
// trips if the network/request itself hangs, not the normal generate-then-
// fallback path (which the backend already bounds and always resolves).
const STRATEGY_TIMEOUT_MS = 8000;

type Props = NativeStackScreenProps<ForecastStackParamList, 'StrategyDetail'>;

export function StrategyDetail({ navigation, route }: Props) {
  const { theme: t } = useTheme();
  const { result, dayLabel, isToday, beachLabel } = route.params;
  const nextLowTide = result.conditions.tide?.nextEvents.find((e) => e.type === 'low') ?? null;

  const [strategyText, setStrategyText] = useState<string | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [loadingStrategy, setLoadingStrategy] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Pre-format the window in the device's local time -- the backend can't
    // reliably localize a raw ISO timestamp to the beach's timezone, so it
    // must receive the same human-readable strings already shown on screen.
    const bestWindowStart = result.bestWindow ? formatTime(result.bestWindow.start) : null;
    const bestWindowEnd = result.bestWindow ? formatTime(result.bestWindow.end) : null;

    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), STRATEGY_TIMEOUT_MS));
    Promise.race([getStrategy(result, beachLabel, dayLabel, bestWindowStart, bestWindowEnd), timeout])
      .then((res) => {
        if (cancelled) return;
        if (res) {
          setStrategyText(res.strategy);
          setIsAiGenerated(res.source === 'ai');
        } else {
          setStrategyText(result.explanation);
          setIsAiGenerated(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setStrategyText(result.explanation);
        setIsAiGenerated(false);
      })
      .finally(() => {
        if (!cancelled) setLoadingStrategy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [result, beachLabel, dayLabel]);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar title="Shelling strategy" left="← Back" onLeft={() => navigation.goBack()} right={beachLabel} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.windowCard}>
          <Eyebrow>Best window {dayLabel}</Eyebrow>
          {result.bestWindow ? (
            <>
              <Text style={[styles.windowTime, { color: t.text }]}>
                {formatTime(result.bestWindow.start)} – {formatTime(result.bestWindow.end)}
              </Text>
              <Text style={[styles.windowNote, { color: t.sea }]}>{result.bestWindow.reason}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.windowTime, { color: t.text }]}>No shelling window {isToday ? 'today' : dayLabel}</Text>
              <Text style={[styles.windowNote, { color: t.sea }]}>
                {isToday ? "Today's" : `${dayLabel}'s`} low tide falls at night, outside daylight hours.
              </Text>
            </>
          )}
          {nextLowTide && (
            <Text style={[styles.windowNote, { color: t.muted, marginTop: 6 }]}>
              Next low tide: {formatTime(nextLowTide.time)}
              {isTomorrow(nextLowTide.time) ? ' (tomorrow)' : ''}
              {(() => {
                const note = daylightNote(nextLowTide.time, result.conditions.weather.sunrise, result.conditions.weather.sunset);
                return note ? ` — ${note}` : '';
              })()}
            </Text>
          )}
        </Card>

        <Card style={styles.strategyCard}>
          <View style={styles.strategyHeader}>
            <Eyebrow style={styles.strategyEyebrow}>Shelling strategy</Eyebrow>
            {isAiGenerated && (
              <View style={[styles.aiTag, { borderColor: t.accent }]}>
                <Text style={[styles.aiTagText, { color: t.accentDeep }]}>✨ AI-generated</Text>
              </View>
            )}
          </View>
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
  windowTime: { fontFamily: fonts.display, fontSize: 20, fontWeight: '600', marginBottom: 2 },
  windowNote: { fontFamily: fonts.data, fontSize: 12 },
  strategyCard: {},
  strategyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  strategyEyebrow: { marginBottom: 0 },
  aiTag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4 },
  aiTagText: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
  strategyLoading: { marginTop: 10, alignSelf: 'flex-start' },
  strategyText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
});

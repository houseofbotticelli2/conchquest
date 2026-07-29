import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { NavBar } from '../../components/NavBar';
import { ForecastStackParamList } from '../../navigation/types';
import { formatTime, isTomorrow, daylightNote } from '../../lib/forecastFormat';

type Props = NativeStackScreenProps<ForecastStackParamList, 'StrategyDetail'>;

export function StrategyDetail({ navigation, route }: Props) {
  const { theme: t } = useTheme();
  const { result, dayLabel, isToday, beachLabel } = route.params;
  const nextLowTide = result.conditions.tide?.nextEvents.find((e) => e.type === 'low') ?? null;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar title="Shelling strategy" left="← Back" onLeft={() => navigation.goBack()} right={beachLabel} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={[styles.comingSoonCard, { borderColor: t.accent }]}>
          <Text style={[styles.comingSoonText, { color: t.accentDeep }]}>
            ✨ AI-enabled strategy coming soon — for now, here's what's driving the score.
          </Text>
        </Card>

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
          <Eyebrow>Shelling strategy</Eyebrow>
          <Text style={[styles.strategyText, { color: t.body }]}>{result.explanation}</Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 24, gap: 12 },
  comingSoonCard: { borderStyle: 'dashed' },
  comingSoonText: { fontFamily: fonts.bodySemiBold, fontSize: 13, lineHeight: 19 },
  windowCard: {},
  windowTime: { fontFamily: fonts.display, fontSize: 20, fontWeight: '600', marginBottom: 2 },
  windowNote: { fontFamily: fonts.data, fontSize: 12 },
  strategyCard: {},
  strategyText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20 },
});

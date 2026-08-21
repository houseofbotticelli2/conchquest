import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { NavBar } from '../../components/NavBar';
import { ForecastStackParamList } from '../../navigation/types';
import { getHourlyTrend, HourlyBlock } from '../../lib/api';
import { formatTime } from '../../lib/forecastFormat';

type Props = NativeStackScreenProps<ForecastStackParamList, 'ConditionsDetail'>;

// Sea-green reads as "good" across the app, so it must not be used for a
// UV level that means "cover up." Mirrors scoreColor's green/gold/coral
// progression so the whole app speaks one color language.
function uvColor(uv: number, t: { sea: string; accent: string }): string {
  if (uv <= 5) return t.sea;
  if (uv <= 7) return '#D9B36C';
  return t.accent;
}

function uvCategory(uv: number): string {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  if (uv <= 10) return 'Very High';
  return 'Extreme';
}

export function ConditionsDetail({ navigation, route }: Props) {
  const { theme: t } = useTheme();
  const { result, dayOffset, dayLabel, beachLabel } = route.params;
  const { weather } = result.conditions;

  const [hourly, setHourly] = useState<HourlyBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHourlyTrend(result.conditions.location.lat, result.conditions.location.lon, dayOffset)
      .then((blocks) => {
        if (!cancelled) setHourly(blocks);
      })
      .catch(() => {
        if (!cancelled) setHourly([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [result.conditions.location.lat, result.conditions.location.lon, dayOffset]);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar title={`Conditions ${dayLabel}`} left="← Back" onLeft={() => navigation.goBack()} right={beachLabel} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card hi style={styles.headerCard}>
          <Text style={[styles.temp, { color: t.text }]}>
            {weather.tempF != null ? `${Math.round(weather.tempF)}°F` : '--°F'}
            {weather.conditions ? ` · ${weather.conditions}` : ''}
          </Text>
          <Text style={[styles.sub, { color: t.muted }]}>
            Sunrise {formatTime(weather.sunrise)} · Sunset {formatTime(weather.sunset)}
          </Text>
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Eyebrow>Humidity</Eyebrow>
            <Text style={[styles.statValue, { color: t.text }]}>
              {weather.humidity != null ? `${Math.round(weather.humidity)}%` : '--'}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Eyebrow>UV Index</Eyebrow>
            {weather.uvIndex != null ? (
              <>
                <Text style={[styles.statValue, { color: t.text }]}>{weather.uvIndex.toFixed(1)}</Text>
                <Text style={[styles.statNote, { color: uvColor(weather.uvIndex, t) }]}>{uvCategory(weather.uvIndex)}</Text>
              </>
            ) : (
              <Text style={[styles.statNote, { color: t.muted, marginTop: 6 }]}>Only available for today</Text>
            )}
          </Card>
        </View>

        <Card style={styles.trendCard}>
          <Eyebrow>Hourly trend</Eyebrow>
          {loading ? (
            <ActivityIndicator color={t.accent} style={{ marginTop: 10 }} />
          ) : hourly.length === 0 ? (
            <Text style={[styles.statNote, { color: t.muted, marginTop: 6 }]}>No hourly forecast available.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourlyRow}>
              {hourly.map((block) => (
                <View key={block.time} style={[styles.hourlyBlock, { backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha }]}>
                  <Text style={[styles.hourlyTime, { color: t.muted }]}>{formatTime(block.time)}</Text>
                  <Text style={[styles.hourlyTemp, { color: t.text }]}>
                    {block.tempF != null ? `${Math.round(block.tempF)}°` : '--'}
                  </Text>
                  <Text style={[styles.hourlyNote, { color: t.sea }]} numberOfLines={2}>
                    {block.conditions ?? '--'}
                  </Text>
                  {block.precipChance != null && (
                    <Text style={[styles.hourlyNote, { color: t.muted }]}>{Math.round(block.precipChance * 100)}% rain</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 24, gap: 12 },
  headerCard: {},
  temp: { fontFamily: fonts.display, fontSize: 22, marginBottom: 2 },
  sub: { fontFamily: fonts.data, fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1 },
  statValue: { fontFamily: fonts.displayBold, fontSize: 24, marginTop: 2 },
  statNote: { fontFamily: fonts.data, fontSize: 11 },
  trendCard: {},
  hourlyRow: { gap: 10, paddingTop: 4 },
  hourlyBlock: { width: 84, borderWidth: 1, borderRadius: 14, padding: 10, alignItems: 'center' },
  hourlyTime: { fontFamily: fonts.data, fontSize: 10 },
  hourlyTemp: { fontFamily: fonts.displayBold, fontSize: 18, marginTop: 2 },
  hourlyNote: { fontFamily: fonts.data, fontSize: 9, textAlign: 'center', marginTop: 3 },
});

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Btn } from '../../components/Btn';
import { ScoreRing } from '../../components/ScoreRing';
import { ForecastStackParamList } from '../../navigation/types';
import { sampleScore } from '../../data/sampleData';

type Props = NativeStackScreenProps<ForecastStackParamList, 'Score'>;

const CHIPS: { label: string; tone: 'sea' | 'mid' }[] = [
  { label: 'TIDE ↓', tone: 'sea' },
  { label: 'WIND ✓', tone: 'sea' },
  { label: 'WAVES ~', tone: 'mid' },
];

export function Score({ navigation }: Props) {
  const { theme: t } = useTheme();

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

        <View style={styles.ringWrap}>
          <ScoreRing score={sampleScore} size={150} />
        </View>

        <Card style={styles.windowCard}>
          <Eyebrow>Best window today</Eyebrow>
          <Text style={[styles.windowTime, { color: t.text }]}>6:15 – 9:30 AM</Text>
          <Text style={[styles.windowNote, { color: t.sea }]}>LOW TIDE + OFFSHORE WIND</Text>
        </Card>

        <View style={styles.chipsRow}>
          {CHIPS.map((c) => (
            <Text
              key={c.label}
              style={[
                styles.chip,
                { backgroundColor: t.surface, borderColor: t.border, color: c.tone === 'sea' ? t.sea : '#D9B36C' },
              ]}
            >
              {c.label}
            </Text>
          ))}
        </View>

        <View style={styles.footer}>
          <Btn label="See score breakdown" onPress={() => navigation.navigate('Detail')} />
        </View>
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
  ringWrap: { paddingVertical: 12, alignItems: 'center' },
  windowCard: { marginHorizontal: 16, marginBottom: 12 },
  windowTime: { fontFamily: fonts.display, fontSize: 20, fontWeight: '600', marginBottom: 2 },
  windowNote: { fontFamily: fonts.data, fontSize: 12 },
  chipsRow: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', gap: 6 },
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

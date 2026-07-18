import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Rect, Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Badge } from '../../components/Badge';
import { MapStackParamList } from '../../navigation/types';
import { sampleFindConditions } from '../../data/sampleData';

type Props = NativeStackScreenProps<MapStackParamList, 'FindDetail'>;

export function FindDetail({ navigation }: Props) {
  const { theme: t } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Map')}>
          <Text style={[styles.back, { color: t.accent }]}>← Map</Text>
        </TouchableOpacity>
      </View>
      <ScrollView>
        <View style={[styles.mapBox, { borderColor: t.border }]}>
          <Svg viewBox="0 0 290 88" width="100%" height={88}>
            <Rect width={290} height={88} fill="#B8C8D0" opacity={0.7} />
            <Rect x={20} y={10} width={250} height={63} rx={6} fill="#C8D8C0" opacity={0.5} />
            <Circle cx={145} cy={43} r={11} fill={t.accentDeep} opacity={0.9} />
            <Circle cx={145} cy={43} r={20} fill={t.accentDeep} opacity={0.15} />
          </Svg>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: t.text }]}>Junonia</Text>
                <Badge type="rare" />
              </View>
              <Text style={[styles.sci, { color: t.muted }]}>Scaphella junonia · Excellent</Text>
            </View>
            <View style={[styles.iconBox, { backgroundColor: t.iconRare, borderColor: t.border }]}>
              <Text style={{ fontSize: 24 }}>🐚</Text>
            </View>
          </View>

          <Card style={styles.conditionsCard}>
            <Eyebrow>Conditions when found</Eyebrow>
            <View style={styles.conditionsRow}>
              {sampleFindConditions.map((c) => (
                <View key={c.label} style={styles.conditionItem}>
                  <Text style={[styles.conditionVal, { color: t.text }]}>{c.val}</Text>
                  <Text style={[styles.conditionLabel, { color: t.muted }]}>{c.label.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </Card>

          <View style={[styles.privacyRow, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
            <Text>🔒</Text>
            <Text style={[styles.privacyText, { color: t.body }]}>Approximate location · ~0.3 mi</Text>
          </View>

          <Text style={[styles.note, { color: t.body }]}>
            "Found just past the wrack line after low tide. Third one this week near this stretch."
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Species', undefined)}
              style={[styles.libraryBtn, { backgroundColor: t.accent }]}
            >
              <Text style={styles.libraryBtnText}>View in library</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
              <Text style={{ fontSize: 16, color: t.text }}>↗</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  back: { fontFamily: fonts.body, fontSize: 14 },
  mapBox: { marginHorizontal: 14, marginVertical: 8, borderRadius: 10, overflow: 'hidden', borderWidth: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontFamily: fonts.display, fontSize: 21, fontWeight: '600' },
  sci: { fontFamily: fonts.data, fontSize: 11 },
  iconBox: { width: 46, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  conditionsCard: { marginBottom: 12 },
  conditionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  conditionItem: { alignItems: 'center' },
  conditionVal: { fontFamily: fonts.dataSemiBold, fontSize: 14 },
  conditionLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, marginBottom: 12 },
  privacyText: { fontFamily: fonts.body, fontSize: 12 },
  note: { fontFamily: fonts.displayItalic, fontSize: 14, lineHeight: 22, marginBottom: 14 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  libraryBtn: { flex: 1, borderRadius: 6, paddingVertical: 12, alignItems: 'center' },
  libraryBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#fff' },
  shareBtn: { width: 52, borderRadius: 6, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
});

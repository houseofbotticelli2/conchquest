import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Eyebrow } from '../../components/Eyebrow';
import { Btn } from '../../components/Btn';
import { LogStackParamList } from '../../navigation/types';
import { sampleConfirmConditions } from '../../data/sampleData';

type Props = NativeStackScreenProps<LogStackParamList, 'LogConfirm'>;

export function LogConfirm({ navigation }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();

  const goToMain = (screen: 'ForecastTab' | 'MapTab') => {
    navigation.getParent()?.dispatch(
      CommonActions.navigate({ name: 'Main', params: { screen } })
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: t.text }]}>Find logged</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.check, { backgroundColor: t.surface, borderColor: t.accent }]}>
          <Text style={[styles.checkMark, { color: t.accent }]}>✓</Text>
        </View>
        <Text style={[styles.title, { color: t.text }]}>Find logged!</Text>
        <Text style={[styles.subtitle, { color: t.body }]}>
          Added to the community map with approximate location only.
        </Text>

        <Card style={styles.card}>
          <Eyebrow>Conditions when found</Eyebrow>
          <View style={styles.conditionsRow}>
            {sampleConfirmConditions.map((c) => (
              <View key={c.label} style={styles.conditionItem}>
                <Text style={[styles.conditionVal, { color: t.text }]}>{c.val}</Text>
                <Text style={[styles.conditionLabel, { color: t.muted }]}>{c.label.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.actions}>
          <Btn label="Back to score" onPress={() => goToMain('ForecastTab')} />
          <Btn label="View on map" variant="ghost" onPress={() => goToMain('MapTab')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontFamily: fonts.display, fontSize: 16, fontWeight: '600' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: 20 },
  check: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  checkMark: { fontSize: 36 },
  title: { fontFamily: fonts.display, fontSize: 22, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  card: { width: '100%', marginBottom: 24 },
  conditionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  conditionItem: { alignItems: 'center' },
  conditionVal: { fontFamily: fonts.dataSemiBold, fontSize: 18 },
  conditionLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
  actions: { width: '100%', gap: 10 },
});

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Btn } from '../../components/Btn';
import { Dots } from '../../components/Dots';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Perms'>;

const PERMS_CARDS = [
  {
    icon: '📍',
    title: 'Location',
    desc: 'Used to fetch tide and weather for your beach. Never stored without permission.',
    btnLabel: 'Allow location',
    variant: 'dark' as const,
  },
  {
    icon: '🔔',
    title: 'Notifications',
    desc: 'Get alerted when saved beaches hit a high score. Optional.',
    btnLabel: 'Maybe later',
    variant: 'ghost' as const,
  },
];

export function Perms({ navigation }: Props) {
  const { theme: t } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: t.text }]}>A couple of things</Text>
        <Text style={[styles.subtitle, { color: t.body }]}>Conchquest works best with your location.</Text>

        {PERMS_CARDS.map((p) => (
          <Card key={p.title} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={[styles.iconBox, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
                <Text style={styles.iconText}>{p.icon}</Text>
              </View>
              <View style={styles.cardTextWrap}>
                <Text style={[styles.cardTitle, { color: t.text }]}>{p.title}</Text>
                <Text style={[styles.cardDesc, { color: t.body }]}>{p.desc}</Text>
              </View>
            </View>
            <Btn label={p.btnLabel} variant={p.variant} />
          </Card>
        ))}

        <Btn label="Continue" onPress={() => navigation.navigate('Beach')} />
      </ScrollView>
      <Dots step={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 22 },
  title: { fontFamily: fonts.display, fontSize: 22, fontWeight: '600', marginBottom: 4 },
  subtitle: { fontFamily: fonts.body, fontSize: 12, marginBottom: 20 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 20 },
  cardTextWrap: { flex: 1 },
  cardTitle: { fontFamily: fonts.display, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  cardDesc: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
});

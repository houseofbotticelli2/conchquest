import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Card } from '../../components/Card';
import { Btn } from '../../components/Btn';
import { Dots } from '../../components/Dots';
import { OnboardingStackParamList } from '../../navigation/types';
import { sampleFeatures } from '../../data/sampleData';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export function Welcome({ navigation }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 22 }]}>
        <View style={[styles.logo, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={styles.logoEmoji}>🐚</Text>
        </View>
        <Text style={[styles.title, { color: t.text }]}>Conchquest</Text>
        <Text style={[styles.tagline, { color: t.sea }]}>Know when to go.</Text>

        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: t.text }]}>The smarter way to shell.</Text>
          {sampleFeatures.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Text style={[styles.featureIcon, { color: t.accent }]}>{f.icon}</Text>
              <Text style={[styles.featureText, { color: t.body }]}>{f.text}</Text>
            </View>
          ))}
        </Card>

        <View style={styles.actions}>
          <Btn label="Get started" onPress={() => navigation.navigate('Signup', { mode: 'signup' })} />
          <Btn label="Log in" variant="ghost" onPress={() => navigation.navigate('Signup', { mode: 'login' })} />
        </View>
      </ScrollView>
      <Dots step={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 22, paddingBottom: 20, alignItems: 'center' },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: { fontSize: 36 },
  title: { fontFamily: fonts.displayBold, fontSize: 32, marginBottom: 4, textAlign: 'center' },
  tagline: { fontFamily: fonts.displayItalic, fontSize: 15, marginBottom: 28, textAlign: 'center' },
  card: { width: '100%', marginBottom: 24 },
  cardTitle: { fontFamily: fonts.display, fontSize: 17, marginBottom: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11 },
  featureIcon: { fontSize: 18, width: 22, textAlign: 'center' },
  featureText: { fontFamily: fonts.body, fontSize: 14, flex: 1 },
  actions: { width: '100%', gap: 10 },
});

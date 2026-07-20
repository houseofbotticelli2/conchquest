import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Eyebrow } from '../../components/Eyebrow';
import { Btn } from '../../components/Btn';
import { Dots } from '../../components/Dots';
import { OnboardingStackParamList } from '../../navigation/types';
import { sampleBeachOptions } from '../../data/sampleData';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Beach'>;

export function Beach({ navigation }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState('Sanibel Island');

  const startShelling = () => {
    navigation.getParent()?.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main' }] }));
  };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
        <Text style={[styles.title, { color: t.text }]}>Your home beach</Text>
        <Text style={[styles.subtitle, { color: t.body }]}>Set a default location. Change it anytime.</Text>

        <View style={[styles.searchBox, { backgroundColor: t.inputBg, borderColor: t.border }]}>
          <Text style={{ color: t.muted }}>🔍</Text>
          <Text style={[styles.searchText, { color: t.muted }]}>Search beaches...</Text>
        </View>

        <Eyebrow>Popular Gulf Coast</Eyebrow>
        <View style={styles.list}>
          <TouchableOpacity
            onPress={() => setSelected('Sanibel Island')}
            style={[
              styles.beachRow,
              styles.beachRowSelected,
              { backgroundColor: t.surface, borderColor: t.accent },
            ]}
          >
            <View>
              <Text style={[styles.beachName, { color: t.text }]}>Sanibel Island</Text>
              <Text style={[styles.beachSub, { color: t.muted }]}>Fort Myers, FL</Text>
            </View>
            {selected === 'Sanibel Island' && <Text style={{ color: t.accent, fontSize: 18 }}>✓</Text>}
          </TouchableOpacity>
          {sampleBeachOptions.map((b) => (
            <TouchableOpacity
              key={b.name}
              onPress={() => setSelected(b.name)}
              style={[styles.beachRow, { backgroundColor: t.surface, borderColor: t.border }]}
            >
              <View>
                <Text style={[styles.beachName, { color: t.text }]}>{b.name}</Text>
                <Text style={[styles.beachSub, { color: t.muted }]}>{b.sub}</Text>
              </View>
              {selected === b.name && <Text style={{ color: t.accent, fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Btn label="Start shelling" onPress={startShelling} />
      </ScrollView>
      <Dots step={3} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 22 },
  title: { fontFamily: fonts.display, fontSize: 22, fontWeight: '600', marginBottom: 4 },
  subtitle: { fontFamily: fonts.body, fontSize: 12, marginBottom: 14 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchText: { fontFamily: fonts.body, fontSize: 13 },
  list: { gap: 5, marginBottom: 24, marginTop: 8 },
  beachRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  beachRowSelected: { borderWidth: 1.5 },
  beachName: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  beachSub: { fontFamily: fonts.data, fontSize: 11 },
});

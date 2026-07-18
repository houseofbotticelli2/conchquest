import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, scoreColor } from '../../theme/tokens';
import { NavBar } from '../../components/NavBar';
import { ProfileStackParamList } from '../../navigation/types';
import { sampleSavedBeaches } from '../../data/sampleData';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Saved'>;

export function Saved({ navigation }: Props) {
  const { theme: t } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar title="Saved beaches" left="← Back" onLeft={() => navigation.goBack()} right="+" />
      <ScrollView contentContainerStyle={styles.content}>
        {sampleSavedBeaches.map((b) => (
          <View
            key={b.name}
            style={[
              styles.beachCard,
              { backgroundColor: t.surface, borderColor: b.featured ? t.accent : t.border, borderWidth: b.featured ? 1.5 : 1 },
            ]}
          >
            <View style={styles.beachTop}>
              <View style={styles.beachTopRow}>
                <View>
                  <View style={styles.nameRow}>
                    <Text style={[styles.beachName, { color: t.text }]}>{b.name}</Text>
                    {b.isHome && (
                      <Text style={[styles.homeBadge, { backgroundColor: t.surfaceAlt, color: t.text, borderColor: t.border }]}>
                        HOME
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.beachSub, { color: t.muted }]}>{b.sub}</Text>
                </View>
                <View style={styles.scoreWrap}>
                  <Text style={[styles.scoreVal, { color: scoreColor(b.score, t) }]}>{b.score}</Text>
                  <Text style={[styles.scoreLabel, { color: t.muted }]}>SCORE NOW</Text>
                </View>
              </View>
              <View style={[styles.conditionBox, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
                <Text style={[styles.conditionText, { color: t.body }]}>{b.condition}</Text>
              </View>
            </View>
            <View style={[styles.beachFooter, { backgroundColor: t.surfaceAlt, borderTopColor: t.borderSoft }]}>
              <Text style={[styles.alertText, { color: t.sea }]}>{b.alert}</Text>
              <Text style={[styles.editText, { color: t.muted }]}>EDIT</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14 },
  beachCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  beachTop: { padding: 14 },
  beachTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  beachName: { fontFamily: fonts.display, fontSize: 14, fontWeight: '600' },
  homeBadge: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4, borderRadius: 10, paddingVertical: 2, paddingHorizontal: 7, borderWidth: 1, overflow: 'hidden' },
  beachSub: { fontFamily: fonts.data, fontSize: 11 },
  scoreWrap: { alignItems: 'flex-end' },
  scoreVal: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 30 },
  scoreLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
  conditionBox: { borderRadius: 6, paddingVertical: 7, paddingHorizontal: 10, borderWidth: 1 },
  conditionText: { fontFamily: fonts.data, fontSize: 11 },
  beachFooter: { borderTopWidth: 1, paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  alertText: { fontFamily: fonts.data, fontSize: 11 },
  editText: { fontFamily: fonts.data, fontSize: 11, letterSpacing: 0.4 },
});

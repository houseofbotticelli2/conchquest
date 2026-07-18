import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Eyebrow } from '../../components/Eyebrow';
import { Btn } from '../../components/Btn';
import { FindRow } from '../../components/FindRow';
import { ProfileStackParamList } from '../../navigation/types';
import { sampleProfileStats, sampleProfileFinds } from '../../data/sampleData';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

export function Profile({ navigation }: Props) {
  const { theme: t } = useTheme();
  const statColor = { text: t.text, accentDeep: t.accentDeep };

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]}>Profile</Text>
        <Text style={{ fontSize: 16, color: t.text }}>⚙</Text>
      </View>
      <ScrollView>
        <View style={[styles.userRow, { borderBottomColor: t.border }]}>
          <View style={[styles.avatar, { backgroundColor: t.navBg }]}>
            <Text style={[styles.avatarText, { color: t.navText }]}>SC</Text>
          </View>
          <View>
            <Text style={[styles.userName, { color: t.text }]}>Sandy C.</Text>
            <Text style={[styles.userSub, { color: t.muted }]}>Shelling since 2024</Text>
            <Text style={[styles.userHome, { color: t.sea }]}>Sanibel Island · Home beach</Text>
          </View>
        </View>

        <View style={[styles.statsRow, { borderBottomColor: t.border }]}>
          {sampleProfileStats.map((s, i) => (
            <View key={s.label} style={[styles.statItem, i < sampleProfileStats.length - 1 && { borderRightWidth: 1, borderRightColor: t.border }]}>
              <Text style={[styles.statVal, { color: statColor[s.tone] }]}>{s.val}</Text>
              <Text style={[styles.statLabel, { color: t.muted }]}>{s.label.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.findsSection}>
          <View style={styles.findsHeader}>
            <Eyebrow style={{ marginBottom: 0 }}>Recent finds</Eyebrow>
            <Text style={[styles.seeAll, { color: t.accent }]}>SEE ALL</Text>
          </View>
          {sampleProfileFinds.map((f) => (
            <FindRow key={f.name} icon={f.icon} bg={f.bg ?? t.surfaceAlt} name={f.name} sub={f.sub} badge={f.badge} />
          ))}
        </View>

        <View style={styles.footer}>
          <Btn label="🔖  Manage saved beaches" variant="ghost" onPress={() => navigation.navigate('Saved')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 19, fontWeight: '600' },
  userRow: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, fontSize: 18, fontWeight: '600' },
  userName: { fontFamily: fonts.display, fontSize: 17, fontWeight: '600' },
  userSub: { fontFamily: fonts.data, fontSize: 11 },
  userHome: { fontFamily: fonts.data, fontSize: 11, marginTop: 1 },
  statsRow: { flexDirection: 'row', borderBottomWidth: 1 },
  statItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  statVal: { fontFamily: fonts.displayBold, fontSize: 24 },
  statLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
  findsSection: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  findsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  seeAll: { fontFamily: fonts.data, fontSize: 11 },
  footer: { marginHorizontal: 18, marginTop: 8, marginBottom: 18 },
});

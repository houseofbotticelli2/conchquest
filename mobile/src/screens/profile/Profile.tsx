import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, scoreColor } from '../../theme/tokens';
import { Eyebrow } from '../../components/Eyebrow';
import { FindRow } from '../../components/FindRow';
import { BadgeType } from '../../components/Badge';
import { SlideUpSheet } from '../../components/SlideUpSheet';
import { ProfileStackParamList } from '../../navigation/types';
import { sampleProfileStats } from '../../data/sampleData';
import { useAuth } from '../../auth/AuthProvider';
import { listMyFinds, listSavedLocations, getAppConfig, Find, SavedLocation } from '../../lib/api';

const DEFAULT_RECENT_FINDS_LIMIT = 7;
const DEFAULT_RECENT_BEACHES_LIMIT = 3;

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

function formatFindDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toBadgeType(rarity: Find['speciesRarity']): BadgeType {
  return rarity === 'very_rare' ? 'rare' : rarity ?? 'common';
}

const HELP_ITEMS = [
  { icon: '🌊', title: 'Forecast', body: 'Get a Shelling Score for a beach based on tide, wind, waves, and moon phase.' },
  { icon: '🧭', title: 'Map', body: 'Browse shells the community has logged nearby.' },
  { icon: '➕', title: 'Log', body: 'Log a find with its species, condition, and whether the location is shown publicly.' },
  { icon: '📖', title: 'Shells', body: 'Browse the shell species library.' },
  { icon: '👤', title: 'Profile', body: 'Your recent finds, stats, and saved beaches.' },
];

export function Profile({ navigation }: Props) {
  const { theme: t } = useTheme();
  const { signOut } = useAuth();
  const statColor = { text: t.text, accentDeep: t.accentDeep };
  const [finds, setFinds] = useState<Find[]>([]);
  const [beaches, setBeaches] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      (async () => {
        let recentFindsLimit = DEFAULT_RECENT_FINDS_LIMIT;
        let recentBeachesLimit = DEFAULT_RECENT_BEACHES_LIMIT;
        try {
          const config = await getAppConfig();
          recentFindsLimit = config.recentFindsLimit;
          recentBeachesLimit = config.recentBeachesLimit;
        } catch {
          // use defaults
        }

        try {
          const [findsResult, beachesResult] = await Promise.all([listMyFinds(recentFindsLimit), listSavedLocations()]);
          setFinds(findsResult);
          setBeaches(beachesResult.slice(0, recentBeachesLimit));
        } catch {
          setFinds([]);
          setBeaches([]);
        } finally {
          setLoading(false);
        }
      })();
    }, [])
  );

  function confirmSignOut() {
    Alert.alert('Log out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: t.text }]}>Profile</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => setHelpOpen(true)}>
            <Ionicons name="help-circle-outline" size={26} color={t.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSettingsOpen(true)}>
            <Ionicons name="settings-outline" size={22} color={t.text} />
          </TouchableOpacity>
        </View>
      </View>

      <SlideUpSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <TouchableOpacity
          style={[styles.sheetRow, { borderTopColor: t.borderSoft }]}
          onPress={() => {
            setSettingsOpen(false);
            navigation.navigate('Saved');
          }}
        >
          <Text style={[styles.sheetRowText, { color: t.text }]}>Manage saved beaches</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sheetRow, { borderTopColor: t.borderSoft }]}
          onPress={() => {
            setSettingsOpen(false);
            confirmSignOut();
          }}
        >
          <Text style={[styles.sheetRowText, { color: t.accentDeep }]}>Log out</Text>
        </TouchableOpacity>
      </SlideUpSheet>

      <SlideUpSheet visible={helpOpen} onClose={() => setHelpOpen(false)} title="How Conchquest works">
        {HELP_ITEMS.map((item) => (
          <View key={item.title} style={styles.helpRow}>
            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.helpTitle, { color: t.text }]}>{item.title}</Text>
              <Text style={[styles.helpBody, { color: t.muted }]}>{item.body}</Text>
            </View>
          </View>
        ))}
      </SlideUpSheet>
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
          </View>
          {loading && <ActivityIndicator color={t.accent} style={{ marginVertical: 12 }} />}
          {!loading && finds.length === 0 && (
            <Text style={[styles.emptyText, { color: t.muted }]}>No finds logged yet.</Text>
          )}
          {!loading &&
            finds.map((f) => (
              <FindRow
                key={f.id}
                icon="🐚"
                bg={t.surfaceAlt}
                name={f.speciesName ?? 'Unidentified shell'}
                sub={`${formatFindDate(f.foundAt)}${f.condition ? ` · ${f.condition}` : ''}`}
                badge={toBadgeType(f.speciesRarity)}
                photoUrl={f.photoUrl}
              />
            ))}
        </View>

        <View style={styles.findsSection}>
          <View style={styles.findsHeader}>
            <Eyebrow style={{ marginBottom: 0 }}>Recent beaches</Eyebrow>
          </View>
          {loading && <ActivityIndicator color={t.accent} style={{ marginVertical: 12 }} />}
          {!loading && beaches.length === 0 && (
            <Text style={[styles.emptyText, { color: t.muted }]}>No saved beaches yet.</Text>
          )}
          {!loading &&
            beaches.map((b) => (
              <View key={b.id} style={[styles.beachRow, { borderBottomColor: t.borderSoft }]}>
                <View style={styles.beachRowBody}>
                  <View style={styles.beachRowNameLine}>
                    <Text style={[styles.beachRowName, { color: t.text }]}>{b.name}</Text>
                    {b.isHome && (
                      <Text style={[styles.homeBadge, { backgroundColor: t.surfaceAlt, color: t.text, borderColor: t.border }]}>
                        HOME
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={[styles.beachRowScore, { color: scoreColor(b.score, t) }]}>{b.score}</Text>
              </View>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 19, fontWeight: '600' },
  sheetRow: { paddingVertical: 14 },
  sheetRowText: { fontFamily: fonts.bodySemiBold, fontSize: 15 },
  helpRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'flex-start' },
  helpTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, marginBottom: 2 },
  helpBody: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
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
  emptyText: { fontFamily: fonts.body, fontSize: 12, paddingVertical: 12 },
  beachRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  beachRowBody: { flex: 1 },
  beachRowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  beachRowName: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
  beachRowScore: { fontFamily: fonts.displayBold, fontSize: 18 },
  homeBadge: {
    fontFamily: fonts.data,
    fontSize: 9,
    letterSpacing: 0.4,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

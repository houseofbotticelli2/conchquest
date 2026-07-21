import React, { useCallback, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, scoreColor } from '../../theme/tokens';
import { Eyebrow } from '../../components/Eyebrow';
import { FindRow } from '../../components/FindRow';
import { Btn } from '../../components/Btn';
import { BadgeType } from '../../components/Badge';
import { SlideUpSheet } from '../../components/SlideUpSheet';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ProfileStackParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthProvider';
import {
  listMyFinds,
  listSavedLocations,
  getAppConfig,
  getFindStats,
  getProfile,
  updateProfile,
  requestPhotoUploadUrl,
  uploadPhoto,
  isPhotoContentType,
  Find,
  SavedLocation,
  FindStats,
  Profile as ProfileData,
  PhotoContentType,
} from '../../lib/api';

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

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
  { icon: '🌊', title: 'Shellcast', body: 'Get a Shelling Score for a beach based on tide, wind, waves, and moon phase.' },
  { icon: '🧭', title: 'Map', body: 'Browse shells the community has logged nearby.' },
  { icon: '➕', title: 'Log', body: 'Log a find with its species, condition, and whether the location is shown publicly.' },
  { icon: '📖', title: 'Shells', body: 'Browse the shell species library.' },
  { icon: '👤', title: 'Profile', body: 'Your recent finds, stats, and saved beaches.' },
];

export function Profile({ navigation }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const statColor = { text: t.text, accentDeep: t.accentDeep };
  const [finds, setFinds] = useState<Find[]>([]);
  const [beaches, setBeaches] = useState<SavedLocation[]>([]);
  const [stats, setStats] = useState<FindStats>({ totalFinds: 0, rareFinds: 0, speciesCount: 0 });
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setProfile(await getProfile());
    } catch {
      setProfile(null);
    }
  }, []);

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
        }

        try {
          setStats(await getFindStats());
        } catch {
          setStats({ totalFinds: 0, rareFinds: 0, speciesCount: 0 });
        }

        await fetchProfile();
        setLoading(false);
      })();
    }, [fetchProfile])
  );

  const displayName = profile?.displayName ?? profile?.email.split('@')[0] ?? 'Shell collector';

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editPhoto, setEditPhoto] = useState<{ uri: string; contentType: PhotoContentType } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  function startEditingProfile() {
    setEditName(displayName);
    setEditYear(profile ? String(profile.shellingSinceYear) : '');
    setEditPhoto(null);
    setEditProfileOpen(true);
  }

  async function handlePickAvatarPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setProfileErrorMsg('Enable photo library access in Settings to change your profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const contentType = isPhotoContentType(asset.mimeType ?? '') ? (asset.mimeType as PhotoContentType) : 'image/jpeg';
    setEditPhoto({ uri: asset.uri, contentType });
  }

  async function saveProfile() {
    if (!editName.trim()) return;
    const year = Number(editYear);
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) {
      setProfileErrorMsg('Enter a valid year.');
      return;
    }
    setSavingProfile(true);
    try {
      let avatarKey: string | undefined;
      if (editPhoto) {
        const { uploadUrl, key } = await requestPhotoUploadUrl(editPhoto.contentType, 'avatar');
        await uploadPhoto(uploadUrl, editPhoto.uri, editPhoto.contentType);
        avatarKey = key;
      }
      setProfile(await updateProfile({ displayName: editName.trim(), shellingSinceYear: year, avatarKey }));
      setEditProfileOpen(false);
    } catch (e) {
      setProfileErrorMsg(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSavingProfile(false);
    }
  }

  const statItems: { val: string; label: string; tone: 'text' | 'accentDeep' }[] = [
    { val: String(stats.totalFinds), label: 'Total finds', tone: 'text' },
    { val: String(stats.rareFinds), label: 'Rare finds', tone: 'accentDeep' },
    { val: String(stats.speciesCount), label: 'Species', tone: 'text' },
  ];

  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  function confirmSignOut() {
    setLogoutConfirmVisible(true);
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
            startEditingProfile();
          }}
        >
          <Text style={[styles.sheetRowText, { color: t.text }]}>Edit profile</Text>
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
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarPhoto} />
            ) : (
              <Text style={[styles.avatarText, { color: t.navText }]}>{initialsFrom(displayName)}</Text>
            )}
          </View>
          <View>
            <Text style={[styles.userName, { color: t.text }]}>{displayName}</Text>
            {profile && <Text style={[styles.userSub, { color: t.muted }]}>Shelling since {profile.shellingSinceYear}</Text>}
            <Text style={[styles.userHome, { color: t.sea }]}>Sanibel Island · Home beach</Text>
          </View>
        </View>

        <View style={[styles.statsRow, { borderBottomColor: t.border }]}>
          {statItems.map((s, i) => (
            <View key={s.label} style={[styles.statItem, i < statItems.length - 1 && { borderRightWidth: 1, borderRightColor: t.border }]}>
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
                  <Text style={[styles.beachRowAlert, { color: t.muted }]}>
                    {b.alertThresholdScore != null ? `Alert at ${b.alertThresholdScore}+` : 'No alert set'}
                  </Text>
                </View>
                <View style={styles.beachRowScoreWrap}>
                  <Text style={[styles.beachRowScore, { color: scoreColor(b.score, t) }]}>{b.score}</Text>
                  <Text style={[styles.beachRowScoreLabel, { color: t.muted }]}>SHELLCAST SCORE</Text>
                </View>
              </View>
            ))}
        </View>
      </ScrollView>

      <SlideUpSheet visible={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Edit profile">
        <TouchableOpacity style={styles.editAvatarWrap} onPress={handlePickAvatarPhoto}>
          <View style={[styles.avatar, styles.editAvatar, { backgroundColor: t.navBg }]}>
            {editPhoto || profile?.avatarUrl ? (
              <Image source={{ uri: editPhoto?.uri ?? profile!.avatarUrl! }} style={styles.avatarPhoto} />
            ) : (
              <Text style={[styles.avatarText, { color: t.navText }]}>{initialsFrom(editName || displayName)}</Text>
            )}
          </View>
          <Text style={[styles.changePhotoText, { color: t.accent }]}>Change photo</Text>
        </TouchableOpacity>
        <View style={styles.editSection}>
          <Text style={[styles.editLabel, { color: t.muted }]}>NAME</Text>
          <TextInput
            value={editName}
            onChangeText={setEditName}
            style={[styles.editInput, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]}
          />
        </View>
        <View style={styles.editSection}>
          <Text style={[styles.editLabel, { color: t.muted }]}>SHELLING SINCE (YEAR)</Text>
          <TextInput
            value={editYear}
            onChangeText={setEditYear}
            keyboardType="number-pad"
            style={[styles.editInput, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]}
          />
        </View>
        {savingProfile ? (
          <ActivityIndicator color={t.accent} style={{ marginTop: 6 }} />
        ) : (
          <Btn label="Save" onPress={saveProfile} style={{ marginTop: 6 }} />
        )}
      </SlideUpSheet>

      <ConfirmDialog
        visible={!!profileErrorMsg}
        title="Could not save profile"
        message={profileErrorMsg ?? undefined}
        buttons={[{ text: 'OK' }]}
        onClose={() => setProfileErrorMsg(null)}
      />

      <ConfirmDialog
        visible={logoutConfirmVisible}
        title="Log out?"
        buttons={[
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log out', style: 'destructive', onPress: () => signOut() },
        ]}
        onClose={() => setLogoutConfirmVisible(false)}
      />
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
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarPhoto: { width: '100%', height: '100%' },
  avatarText: { fontFamily: fonts.display, fontSize: 18, fontWeight: '600' },
  editAvatarWrap: { alignItems: 'center', gap: 8, marginBottom: 16 },
  editAvatar: { width: 76, height: 76, borderRadius: 38 },
  changePhotoText: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
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
  beachRowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  beachRowAlert: { fontFamily: fonts.data, fontSize: 10, letterSpacing: 0.3 },
  beachRowScoreWrap: { alignItems: 'flex-end' },
  beachRowScoreLabel: { fontFamily: fonts.data, fontSize: 8, letterSpacing: 0.3 },
  beachRowName: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
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
  editSection: { gap: 6, marginBottom: 14 },
  editLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
  editInput: { fontFamily: fonts.body, fontSize: 13, borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12 },
});

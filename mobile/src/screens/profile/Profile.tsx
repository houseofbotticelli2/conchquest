import React, { useCallback, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { enableBeachAlerts, disableBeachAlerts } from '../../lib/notifications';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, tabularNums } from '../../theme/tokens';
import { Eyebrow } from '../../components/Eyebrow';
import { Field } from '../../components/Field';
import { ListRow } from '../../components/ListRow';
import { Badge } from '../../components/Badge';
import { Btn } from '../../components/Btn';
import { BadgeType } from '../../components/Badge';
import { SlideUpSheet } from '../../components/SlideUpSheet';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PhotoViewer } from '../../components/PhotoViewer';
import { ProfileStackParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthProvider';
import { WEB_APP_URL } from '../../lib/supabase';
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
  listBlockedUsers,
  unblockUser,
  Find,
  SavedLocation,
  FindStats,
  Profile as ProfileData,
  PhotoContentType,
  BlockedUser,
  requestDeleteAccount,
  cancelDeleteAccount,
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
  {
    icon: '🌊',
    title: 'Shellcast',
    body: 'Get a Shelling Score for a beach based on tide, wind, waves, and moon phase. Tap for more:',
    bullets: [
      'The score circle — full factor breakdown',
      '"Best Window" — the shelling strategy',
      '"Conditions" — humidity, UV, and the hourly forecast',
      'The day strip — plan a few days ahead with the multi-day forecast',
    ],
  },
  { icon: '🧭', title: 'Map', body: "See your position, browse shells the community has logged nearby, use the pin to pick a saved beach, and report or block a find that doesn't belong." },
  { icon: '🐚', title: 'My Shells', body: 'Log a new find with its species, condition, photo, and whether the location is shown publicly. Tap the book icon to browse the shell species library.' },
  { icon: '🏖️', title: 'My Beaches', body: 'Save your favorite beaches, mark a home beach, and get notified when one hits a Shelling Score you set.' },
  { icon: '👤', title: 'Profile', body: 'Your recent finds, stats, and settings.' },
];

export function Profile({ navigation }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const { signOut, changePassword } = useAuth();
  const [expandedFindId, setExpandedFindId] = useState<string | null>(null);
  const [expandedBeachId, setExpandedBeachId] = useState<string | null>(null);
  const [zoomUri, setZoomUri] = useState<string | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);
  const statColor = { text: t.text, accentDeep: t.accentDeep };
  const [finds, setFinds] = useState<Find[]>([]);
  const [beaches, setBeaches] = useState<SavedLocation[]>([]);
  const [stats, setStats] = useState<FindStats>({ totalFinds: 0, rareFinds: 0, speciesCount: 0 });
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifErrorMsg, setNotifErrorMsg] = useState<string | null>(null);

  async function openSettings() {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
    setSettingsOpen(true);
  }

  async function handleToggleNotifications() {
    if (notificationsEnabled) {
      await disableBeachAlerts();
      setNotificationsEnabled(false);
      return;
    }
    const result = await enableBeachAlerts();
    if (result === 'enabled') {
      setNotificationsEnabled(true);
    } else if (result === 'denied') {
      setNotifErrorMsg('Notifications permission was denied. Enable it for Conchquest in your device Settings app.');
    } else {
      setNotifErrorMsg("Push notifications aren't supported on this device/simulator.");
    }
  }

  const fetchProfile = useCallback(async () => {
    try {
      setProfile(await getProfile());
    } catch {
      setProfile(null);
    }
  }, []);

  async function handleToggleDaylightRestriction() {
    if (!profile) return;
    try {
      setProfile(await updateProfile({ restrictShellingToDaylight: !profile.restrictShellingToDaylight }));
    } catch {
      // Non-critical setting -- leave it showing the last-known value rather
      // than surfacing an error dialog for a toggle.
    }
  }

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

        const [findsResult, beachesResult, statsResult] = await Promise.all([
          listMyFinds(recentFindsLimit).catch(() => []),
          listSavedLocations(recentBeachesLimit).catch(() => []),
          getFindStats().catch(() => ({ totalFinds: 0, rareFinds: 0, speciesCount: 0 })),
          fetchProfile(),
        ]);
        setFinds(findsResult);
        setBeaches(beachesResult);
        setStats(statsResult);
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
  const [avatarSourceOpen, setAvatarSourceOpen] = useState(false);
  // On iOS, RN's Modal is backed by a real presented view controller --
  // opening the avatar-source dialog (or the system picker) while the Edit
  // Profile sheet's own Modal is still up/mid-dismiss stacks two/three
  // presentations and silently fails to show. These defer opening the next
  // one until the previous Modal's native dismiss animation has actually
  // finished (Modal's onDismiss, iOS only -- a no-op elsewhere, which is
  // fine since Android/web don't have this restriction).
  const [avatarPickerRequested, setAvatarPickerRequested] = useState(false);
  const [pendingPickerSource, setPendingPickerSource] = useState<'camera' | 'library' | null>(null);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  const [blockedUsersOpen, setBlockedUsersOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  function openChangePhoto() {
    if (Platform.OS === 'ios') {
      setAvatarPickerRequested(true);
      setEditProfileOpen(false);
    } else {
      setAvatarSourceOpen(true);
    }
  }

  function startEditingProfile() {
    setEditName(displayName);
    setEditYear(profile ? String(profile.shellingSinceYear) : '');
    setEditPhoto(null);
    setEditProfileOpen(true);
  }

  function startChangingPassword() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setChangePasswordError(null);
    setChangePasswordOpen(true);
  }

  async function handleChangePassword() {
    setChangePasswordError(null);
    if (newPassword.length < 8) {
      setChangePasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setChangePasswordError('New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    const result = await changePassword(currentPassword, newPassword);
    setChangingPassword(false);
    if (result.error) {
      setChangePasswordError(result.error);
      return;
    }
    setChangePasswordOpen(false);
  }

  function openBlockedUsers() {
    setBlockedUsersOpen(true);
    setLoadingBlockedUsers(true);
    listBlockedUsers()
      .then(setBlockedUsers)
      .finally(() => setLoadingBlockedUsers(false));
  }

  async function handleUnblock(userId: string) {
    setUnblockingId(userId);
    try {
      await unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.userId !== userId));
    } finally {
      setUnblockingId(null);
    }
  }

  function applyAvatarAsset(asset: ImagePicker.ImagePickerAsset) {
    const contentType = isPhotoContentType(asset.mimeType ?? '') ? (asset.mimeType as PhotoContentType) : 'image/jpeg';
    setEditPhoto({ uri: asset.uri, contentType });
  }

  async function handlePickAvatarFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setProfileErrorMsg('Enable photo library access in Settings to change your profile photo.');
      setEditProfileOpen(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) applyAvatarAsset(result.assets[0]);
    setEditProfileOpen(true);
  }

  async function handlePickAvatarFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setProfileErrorMsg('Enable camera access in Settings to take a profile photo.');
      setEditProfileOpen(true);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled) applyAvatarAsset(result.assets[0]);
    setEditProfileOpen(true);
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
          <TouchableOpacity onPress={openSettings}>
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
            startChangingPassword();
          }}
        >
          <Text style={[styles.sheetRowText, { color: t.text }]}>Change password</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sheetRow, { borderTopColor: t.borderSoft }]}
          onPress={() => {
            setSettingsOpen(false);
            openBlockedUsers();
          }}
        >
          <Text style={[styles.sheetRowText, { color: t.text }]}>Blocked users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sheetRow, styles.sheetRowBetween, { borderTopColor: t.borderSoft }]}
          onPress={handleToggleNotifications}
        >
          <Text style={[styles.sheetRowText, { color: t.text }]}>Beach alert notifications</Text>
          <Ionicons name={notificationsEnabled ? 'checkbox' : 'square-outline'} size={20} color={t.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sheetRow, styles.sheetRowBetween, { borderTopColor: t.borderSoft }]}
          onPress={handleToggleDaylightRestriction}
        >
          <View>
            <Text style={[styles.sheetRowText, { color: t.text }]}>Daylight hours only</Text>
            <Text style={[styles.sheetRowSub, { color: t.muted }]}>Off shows shelling windows at any hour, day or night.</Text>
          </View>
          <Ionicons name={profile?.restrictShellingToDaylight ? 'checkbox' : 'square-outline'} size={20} color={t.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sheetRow, { borderTopColor: t.borderSoft }]}
          onPress={() => Linking.openURL(`${WEB_APP_URL}/privacy`)}
        >
          <Text style={[styles.sheetRowText, { color: t.text }]}>Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sheetRow, { borderTopColor: t.borderSoft }]}
          onPress={() => Linking.openURL(`${WEB_APP_URL}/terms`)}
        >
          <Text style={[styles.sheetRowText, { color: t.text }]}>Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sheetRow, { borderTopColor: t.borderSoft }]}
          onPress={() => Linking.openURL(`${WEB_APP_URL}/community-guidelines`)}
        >
          <Text style={[styles.sheetRowText, { color: t.text }]}>Community Guidelines</Text>
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
        <TouchableOpacity
          style={[styles.sheetRow, { borderTopColor: t.borderSoft }]}
          onPress={() => {
            setSettingsOpen(false);
            setDeleteConfirmVisible(true);
          }}
        >
          <Text style={[styles.sheetRowText, { color: t.accentDeep }]}>Delete my account</Text>
        </TouchableOpacity>
      </SlideUpSheet>

      <ConfirmDialog
        visible={!!notifErrorMsg}
        title="Couldn't enable notifications"
        message={notifErrorMsg ?? undefined}
        buttons={[{ text: 'OK' }]}
        onClose={() => setNotifErrorMsg(null)}
      />

      <SlideUpSheet visible={helpOpen} onClose={() => setHelpOpen(false)} title="How Conchquest works">
        {HELP_ITEMS.map((item) => (
          <View key={item.title} style={styles.helpRow}>
            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.helpTitle, { color: t.text }]}>{item.title}</Text>
              <Text style={[styles.helpBody, { color: t.muted }]}>{item.body}</Text>
              {item.bullets?.map((bullet) => (
                <Text key={bullet} style={[styles.helpBullet, { color: t.muted }]}>
                  {'•'} {bullet}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </SlideUpSheet>
      <ScrollView>
        {profile?.deletionRequestedAt && (
          <View style={[styles.deletionBanner, { backgroundColor: t.surfaceInset, borderColor: t.accentDeep }]}>
            <Text style={[styles.deletionBannerTitle, { color: t.accentDeep }]}>Account scheduled for deletion</Text>
            <Text style={[styles.deletionBannerText, { color: t.muted }]}>
              {profile.deletionScheduledFor
                ? `Everything will be permanently removed on ${new Date(profile.deletionScheduledFor).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}. Your finds are already hidden from the community.`
                : 'Your finds are already hidden from the community.'}
            </Text>
            <Btn
              label="Restore my account"
              onPress={async () => {
                try {
                  await cancelDeleteAccount();
                  setProfile(await getProfile());
                } catch (e) {
                  setDeleteErrorMsg(e instanceof Error ? e.message : 'Please try again.');
                }
              }}
            />
          </View>
        )}
        <View style={[styles.userRow, { borderBottomColor: t.border }]}>
          <View style={[styles.avatar, { backgroundColor: t.navBg, borderColor: t.surfaceCardHi }, t.shadowRaised]}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarPhoto} />
            ) : (
              <Text style={[styles.avatarText, { color: t.navText }]}>{initialsFrom(displayName)}</Text>
            )}
          </View>
          <View>
            <Text style={[styles.userName, { color: t.text }]}>{displayName}</Text>
            {profile && <Text style={[styles.userSub, { color: t.muted }]}>Shelling since {profile.shellingSinceYear}</Text>}
          </View>
        </View>

        {/* The trophy shelf -- lifted onto its own card rather than sharing
            the page plane with everything else. */}
        <View style={[styles.statsRow, { backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha }, t.shadowRaised]}>
          {statItems.map((s, i) => (
            <View key={s.label} style={[styles.statItem, i < statItems.length - 1 && { borderRightWidth: 1, borderRightColor: t.borderSoftAlpha }]}>
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
            // Deliberately no `action` on either preview: Profile is a
            // summary you read, not a place you act. Tap to expand and see
            // it; edit from My Shells or My Beaches. (docs/TODO.md #112)
            finds.map((f) => (
              <ListRow
                key={f.id}
                bg={t.surfaceInset}
                photoUrl={f.thumbUrl ?? f.photoUrl}
                name={f.speciesName ?? 'Unidentified shell'}
                meta={formatFindDate(f.foundAt)}
                chips={<Badge type={toBadgeType(f.speciesRarity)} />}
                expanded={expandedFindId === f.id}
                onPress={() => setExpandedFindId((id) => (id === f.id ? null : f.id))}
              >
                {(f.thumbUrl ?? f.photoUrl) && (
                  <TouchableOpacity onPress={() => setZoomUri(f.photoUrl)} accessibilityRole="imagebutton">
                    <Image source={{ uri: f.thumbUrl ?? f.photoUrl ?? undefined }} style={styles.expandedPhoto} />
                  </TouchableOpacity>
                )}
                {!!f.condition && (
                  <Text style={[styles.expandedDetail, { color: t.muted }]}>
                    Condition: {f.condition.charAt(0).toUpperCase() + f.condition.slice(1)}
                  </Text>
                )}
                {!!f.notes && <Text style={[styles.expandedDetail, { color: t.muted }]}>Note: {f.notes}</Text>}
              </ListRow>
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
              <ListRow
                key={b.id}
                score={b.score}
                name={b.name}
                sub={b.city ?? undefined}
                expanded={expandedBeachId === b.id}
                onPress={() => setExpandedBeachId((id) => (id === b.id ? null : b.id))}
                chips={
                  b.alertThresholdScore != null ? (
                    <Text style={[styles.alertChip, { backgroundColor: t.surfaceInset, color: t.sea, borderColor: t.borderSoftAlpha }]}>
                      🔔 {b.alertThresholdScore}+
                    </Text>
                  ) : undefined
                }
              >
                <Text style={[styles.expandedDetail, { color: t.muted }]}>
                  Shelling score {b.score} · Confidence {b.confidence}
                </Text>
                {b.alertThresholdScore != null && (
                  <Text style={[styles.expandedDetail, { color: t.muted }]}>
                    You'll be notified when this beach reaches a shellcast of {b.alertThresholdScore}.
                  </Text>
                )}
                {!!b.notes && <Text style={[styles.expandedDetail, { color: t.muted }]}>{b.notes}</Text>}
              </ListRow>
            ))}
        </View>
      </ScrollView>

      <SlideUpSheet
        visible={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        onDismiss={() => {
          if (avatarPickerRequested) {
            setAvatarPickerRequested(false);
            setAvatarSourceOpen(true);
          }
        }}
        title="Edit profile"
      >
        <TouchableOpacity style={styles.editAvatarWrap} onPress={openChangePhoto}>
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
          <Field
            value={editName}
            onChangeText={setEditName}
            style={styles.editInput}
          />
        </View>
        <View style={styles.editSection}>
          <Text style={[styles.editLabel, { color: t.muted }]}>SHELLING SINCE (YEAR)</Text>
          <Field
            value={editYear}
            onChangeText={setEditYear}
            keyboardType="number-pad"
            style={styles.editInput}
          />
        </View>
        {savingProfile ? (
          <ActivityIndicator color={t.accent} style={{ marginTop: 6 }} />
        ) : (
          <Btn label="Save" onPress={saveProfile} style={{ marginTop: 6 }} />
        )}
      </SlideUpSheet>

      <SlideUpSheet visible={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} title="Change password">
        <View style={styles.editSection}>
          <Text style={[styles.editLabel, { color: t.muted }]}>CURRENT PASSWORD</Text>
          <Field
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            style={styles.editInput}
          />
        </View>
        <View style={styles.editSection}>
          <Text style={[styles.editLabel, { color: t.muted }]}>NEW PASSWORD</Text>
          <Field
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
            style={styles.editInput}
          />
        </View>
        <View style={styles.editSection}>
          <Text style={[styles.editLabel, { color: t.muted }]}>CONFIRM NEW PASSWORD</Text>
          <Field
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            secureTextEntry
            autoCapitalize="none"
            style={styles.editInput}
          />
        </View>
        {changingPassword ? (
          <ActivityIndicator color={t.accent} style={{ marginTop: 6 }} />
        ) : (
          <Btn label="Update password" onPress={handleChangePassword} style={{ marginTop: 6 }} />
        )}
      </SlideUpSheet>

      <SlideUpSheet visible={blockedUsersOpen} onClose={() => setBlockedUsersOpen(false)} title="Blocked users">
        {loadingBlockedUsers ? (
          <ActivityIndicator color={t.accent} style={{ marginTop: 6 }} />
        ) : blockedUsers.length === 0 ? (
          <Text style={[styles.sheetRowText, { color: t.muted }]}>You haven't blocked anyone.</Text>
        ) : (
          blockedUsers.map((u) => (
            <View key={u.userId} style={[styles.sheetRow, styles.sheetRowBetween, { borderTopColor: t.borderSoft }]}>
              <Text style={[styles.sheetRowText, { color: t.text }]}>{u.displayName}</Text>
              {unblockingId === u.userId ? (
                <ActivityIndicator color={t.accent} />
              ) : (
                <TouchableOpacity onPress={() => handleUnblock(u.userId)}>
                  <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 13, color: t.accent }}>Unblock</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
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
        visible={!!changePasswordError}
        title="Could not change password"
        message={changePasswordError ?? undefined}
        buttons={[{ text: 'OK' }]}
        onClose={() => setChangePasswordError(null)}
      />

      <ConfirmDialog
        visible={avatarSourceOpen}
        title="Change photo"
        buttons={[
          {
            text: 'Camera',
            onPress: () => (Platform.OS === 'ios' ? setPendingPickerSource('camera') : handlePickAvatarFromCamera()),
          },
          {
            text: 'Photos',
            onPress: () => (Platform.OS === 'ios' ? setPendingPickerSource('library') : handlePickAvatarFromLibrary()),
          },
          { text: 'Cancel', style: 'cancel' },
        ]}
        onClose={() => setAvatarSourceOpen(false)}
        onDismiss={() => {
          if (pendingPickerSource === 'camera') {
            setPendingPickerSource(null);
            handlePickAvatarFromCamera();
          } else if (pendingPickerSource === 'library') {
            setPendingPickerSource(null);
            handlePickAvatarFromLibrary();
          }
        }}
      />

      <PhotoViewer uri={zoomUri} visible={!!zoomUri} onRequestClose={() => setZoomUri(null)} />

      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="Delete your account?"
        message={`This removes your finds, photos, saved beaches, and profile. Your finds disappear from the community straight away.\n\nYou have 14 days to change your mind — just log back in and tap Restore. After that it's permanent.`}
        buttons={[
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete account',
            style: 'destructive',
            onPress: async () => {
              try {
                await requestDeleteAccount();
                // Sign out so the account isn't left sitting logged in mid-deletion.
                await signOut();
              } catch (e) {
                setDeleteErrorMsg(e instanceof Error ? e.message : 'Please try again.');
              }
            },
          },
        ]}
        onClose={() => setDeleteConfirmVisible(false)}
      />

      <ConfirmDialog
        visible={!!deleteErrorMsg}
        title="Couldn't delete your account"
        message={deleteErrorMsg ?? undefined}
        buttons={[{ text: 'OK' }]}
        onClose={() => setDeleteErrorMsg(null)}
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
  alertChip: {
    fontFamily: fonts.data, fontSize: 10, letterSpacing: 0.3, borderRadius: 20,
    paddingVertical: 2, paddingHorizontal: 8, borderWidth: 1, overflow: 'hidden',
  },
  expandedPhoto: { width: '100%', aspectRatio: 1, borderRadius: 10 },
  expandedDetail: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  deletionBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  deletionBannerTitle: { fontSize: 15, fontFamily: fonts.bodySemiBold },
  deletionBannerText: { fontSize: 13, lineHeight: 19 },
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 19 },
  sheetRow: { paddingVertical: 14 },
  sheetRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetRowText: { fontFamily: fonts.bodySemiBold, fontSize: 15 },
  sheetRowSub: { fontFamily: fonts.body, fontSize: 12, marginTop: 2, maxWidth: 240 },
  helpRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, alignItems: 'flex-start' },
  helpTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, marginBottom: 2 },
  helpBody: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  helpBullet: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  userRow: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2 },
  avatarPhoto: { width: '100%', height: '100%' },
  avatarText: { fontFamily: fonts.display, fontSize: 18 },
  editAvatarWrap: { alignItems: 'center', gap: 8, marginBottom: 16 },
  editAvatar: { width: 76, height: 76, borderRadius: 38 },
  changePhotoText: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  userName: { fontFamily: fonts.display, fontSize: 17 },
  userSub: { fontFamily: fonts.data, fontSize: 11 },
  statsRow: { flexDirection: 'row', marginHorizontal: 14, marginTop: 14, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  statItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  statVal: { fontFamily: fonts.displayBold, fontSize: 24 , ...tabularNums },
  statLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
  findsSection: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  findsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  emptyText: { fontFamily: fonts.body, fontSize: 12, paddingVertical: 12 },
  beachRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  beachRowBody: { flex: 1 },
  beachRowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  beachRowAlert: { fontFamily: fonts.data, fontSize: 10, letterSpacing: 0.3 },
  beachRowScoreWrap: { alignItems: 'flex-end' },
  beachRowScoreLabel: { fontFamily: fonts.data, fontSize: 8, letterSpacing: 0.3 },
  beachRowName: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  beachRowScore: { fontFamily: fonts.displayBold, fontSize: 18 , ...tabularNums },
  editSection: { gap: 6, marginBottom: 14 },
  editLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
  editInput: { fontFamily: fonts.body, fontSize: 13, borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12 },
});

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, scoreColor } from '../../theme/tokens';
import { NavBar } from '../../components/NavBar';
import { Btn } from '../../components/Btn';
import { ProfileStackParamList } from '../../navigation/types';
import { listSavedLocations, createSavedLocation, updateSavedLocation, deleteSavedLocation, SavedLocation } from '../../lib/api';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Saved'>;

// No location picker/GPS yet — same fixed Sanibel Island location used
// elsewhere in the app (Score, Log) is used as the "current" spot to save.
const DEFAULT_LOCATION = { lat: 26.4615, lon: -82.1867, label: 'Sanibel Island' };
const ALERT_STEP = 1;

export function Saved({ navigation }: Props) {
  const { theme: t } = useTheme();
  const [beaches, setBeaches] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAlert, setEditAlert] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchBeaches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBeaches(await listSavedLocations());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load saved beaches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBeaches();
  }, [fetchBeaches]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createSavedLocation({ name: newName.trim(), lat: DEFAULT_LOCATION.lat, lon: DEFAULT_LOCATION.lon });
      setNewName('');
      setAdding(false);
      await fetchBeaches();
    } catch (e) {
      Alert.alert('Could not add beach', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSetHome(id: string) {
    await updateSavedLocation(id, { isHome: true });
    fetchBeaches();
  }

  function adjustDraftAlert(delta: number) {
    setEditAlert((prev) => Math.max(0, Math.min(100, prev + delta)));
  }

  function startEditing(beach: SavedLocation) {
    setEditingId(beach.id);
    setEditName(beach.name);
    setEditAlert(beach.alertThresholdScore ?? beach.score);
  }

  function cancelEditing() {
    setEditingId(null);
  }

  async function handleDoneEditing(id: string) {
    if (!editName.trim()) return;
    setSavingEdit(true);
    try {
      await updateSavedLocation(id, { name: editName.trim(), alertThresholdScore: editAlert });
      await fetchBeaches();
      setEditingId(null);
    } catch (e) {
      Alert.alert('Could not save changes', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSavingEdit(false);
    }
  }

  function confirmRemove(beach: SavedLocation) {
    Alert.alert(`Remove ${beach.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteSavedLocation(beach.id);
          fetchBeaches();
        },
      },
    ]);
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar title="Saved beaches" left="← Back" onLeft={() => navigation.goBack()} right="+" onRight={() => setAdding((v) => !v)} />
      <ScrollView contentContainerStyle={styles.content}>
        {adding && (
          <View style={[styles.addBox, { backgroundColor: t.surface, borderColor: t.border }]}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder={`Beach name (near ${DEFAULT_LOCATION.label})`}
              placeholderTextColor={t.muted}
              style={[styles.addInput, { borderColor: t.border, color: t.text }]}
            />
            {saving ? (
              <ActivityIndicator color={t.accent} />
            ) : (
              <Btn label="Save beach" onPress={handleAdd} style={{ marginTop: 10 }} />
            )}
          </View>
        )}

        {loading && <ActivityIndicator color={t.accent} style={{ marginVertical: 20 }} />}
        {!loading && error && <Text style={[styles.emptyText, { color: t.accentDeep }]}>{error}</Text>}
        {!loading && !error && beaches.length === 0 && (
          <Text style={[styles.emptyText, { color: t.muted }]}>No saved beaches yet — tap + to add one.</Text>
        )}

        {!loading &&
          !error &&
          beaches.map((b) => (
            <View
              key={b.id}
              style={[
                styles.beachCard,
                { backgroundColor: t.surface, borderColor: b.isHome ? t.accent : t.border, borderWidth: b.isHome ? 1.5 : 1 },
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
                  </View>
                  <View style={styles.scoreWrap}>
                    <Text style={[styles.scoreVal, { color: scoreColor(b.score, t) }]}>{b.score}</Text>
                    <Text style={[styles.scoreLabel, { color: t.muted }]}>SCORE NOW</Text>
                  </View>
                </View>
                <View style={[styles.conditionBox, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
                  <Text style={[styles.conditionText, { color: t.body }]}>{b.conditionSummary}</Text>
                </View>
              </View>

              {editingId === b.id ? (
                <View style={[styles.editPanel, { backgroundColor: t.surfaceAlt, borderTopColor: t.borderSoft }]}>
                  <View style={styles.editSection}>
                    <Text style={[styles.editLabel, { color: t.muted }]}>NAME</Text>
                    <TextInput
                      value={editName}
                      onChangeText={setEditName}
                      style={[styles.nameInput, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]}
                    />
                  </View>

                  <View style={styles.editSection}>
                    <Text style={[styles.editLabel, { color: t.muted }]}>ALERT THRESHOLD</Text>
                    <View style={styles.alertStepperRow}>
                      <TouchableOpacity onPress={() => adjustDraftAlert(-ALERT_STEP)} style={styles.stepperBtn} hitSlop={8}>
                        <Ionicons name="remove-circle-outline" size={26} color={t.text} />
                      </TouchableOpacity>
                      <Text style={[styles.alertText, { color: t.sea }]}>🔔 Alert at score {editAlert}+</Text>
                      <TouchableOpacity onPress={() => adjustDraftAlert(ALERT_STEP)} style={styles.stepperBtn} hitSlop={8}>
                        <Ionicons name="add-circle-outline" size={26} color={t.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.editActionsRow}>
                    {!b.isHome && (
                      <TouchableOpacity onPress={() => handleSetHome(b.id)} hitSlop={8}>
                        <Text style={[styles.editText, { color: t.muted }]}>SET HOME</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => confirmRemove(b)} hitSlop={8}>
                      <Text style={[styles.editText, { color: t.accentDeep }]}>REMOVE</Text>
                    </TouchableOpacity>
                    {savingEdit ? (
                      <ActivityIndicator color={t.accent} style={{ marginLeft: 'auto' }} />
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 16, marginLeft: 'auto' }}>
                        <TouchableOpacity onPress={cancelEditing} hitSlop={8}>
                          <Text style={[styles.editText, { color: t.muted }]}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDoneEditing(b.id)} hitSlop={8}>
                          <Text style={[styles.editText, { color: t.accent }]}>DONE</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                <View style={[styles.beachFooter, { backgroundColor: t.surfaceAlt, borderTopColor: t.borderSoft }]}>
                  <Text style={[styles.alertText, { color: t.sea }]}>
                    {b.alertThresholdScore != null ? `🔔 Alert at score ${b.alertThresholdScore}+` : '🔕 No alert set'}
                  </Text>
                  <Text style={[styles.editText, { color: t.muted }]} onPress={() => startEditing(b)}>
                    EDIT
                  </Text>
                </View>
              )}
            </View>
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14 },
  addBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
  addInput: { fontFamily: fonts.body, fontSize: 13, borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12 },
  emptyText: { fontFamily: fonts.body, fontSize: 12, paddingVertical: 20, textAlign: 'center' },
  beachCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  beachTop: { padding: 14 },
  beachTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  beachName: { fontFamily: fonts.display, fontSize: 14, fontWeight: '600' },
  homeBadge: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4, borderRadius: 10, paddingVertical: 2, paddingHorizontal: 7, borderWidth: 1, overflow: 'hidden' },
  scoreWrap: { alignItems: 'flex-end' },
  scoreVal: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 30 },
  scoreLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
  conditionBox: { borderRadius: 6, paddingVertical: 7, paddingHorizontal: 10, borderWidth: 1 },
  conditionText: { fontFamily: fonts.data, fontSize: 11 },
  beachFooter: { borderTopWidth: 1, paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editPanel: { borderTopWidth: 1, padding: 14, gap: 14 },
  editSection: { gap: 6 },
  editLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
  nameInput: { fontFamily: fonts.body, fontSize: 13, borderWidth: 1, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10 },
  alertStepperRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperBtn: { padding: 2 },
  editActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 2 },
  alertText: { fontFamily: fonts.data, fontSize: 11, flex: 1 },
  editText: { fontFamily: fonts.data, fontSize: 11, letterSpacing: 0.4 },
});

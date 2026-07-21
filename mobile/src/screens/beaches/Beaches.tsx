import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, scoreColor } from '../../theme/tokens';
import { Btn } from '../../components/Btn';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { BeachesStackParamList } from '../../navigation/types';
import { listSavedLocations, createSavedLocation, updateSavedLocation, deleteSavedLocation, SavedLocation } from '../../lib/api';

type Props = NativeStackScreenProps<BeachesStackParamList, 'Beaches'>;

// No location picker/GPS yet — same fixed Sanibel Island location used
// elsewhere in the app (Score, Log) is used as the "current" spot to save.
const DEFAULT_LOCATION = { lat: 26.4615, lon: -82.1867, label: 'Sanibel Island' };
const ALERT_STEP = 1;
const DEFAULT_NEW_ALERT = 50;

const FILTERS: { label: string; home?: boolean; hasAlert?: boolean }[] = [
  { label: 'All' },
  { label: 'Home', home: true },
  { label: 'Has alert', hasAlert: true },
  { label: 'No alert', hasAlert: false },
];

export function Beaches(_props: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const [beaches, setBeaches] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(0);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newAlertEnabled, setNewAlertEnabled] = useState(false);
  const [newAlert, setNewAlert] = useState(DEFAULT_NEW_ALERT);
  const [newIsHome, setNewIsHome] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAlert, setEditAlert] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);
  const [addErrorMsg, setAddErrorMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<SavedLocation | null>(null);

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

  const visibleBeaches = useMemo(() => {
    const filter = FILTERS[activeFilter];
    const query = search.trim().toLowerCase();
    return beaches.filter((b) => {
      if (query && !b.name.toLowerCase().includes(query)) return false;
      if (filter.home && !b.isHome) return false;
      if (filter.hasAlert === true && b.alertThresholdScore == null) return false;
      if (filter.hasAlert === false && b.alertThresholdScore != null) return false;
      return true;
    });
  }, [beaches, search, activeFilter]);

  function adjustNewAlert(delta: number) {
    setNewAlert((prev) => Math.max(0, Math.min(100, prev + delta)));
  }

  function openAdd() {
    setNewName('');
    setNewCity('');
    setNewAlertEnabled(false);
    setNewAlert(DEFAULT_NEW_ALERT);
    setNewIsHome(false);
    setAdding((v) => !v);
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const created = await createSavedLocation({
        name: newName.trim(),
        lat: DEFAULT_LOCATION.lat,
        lon: DEFAULT_LOCATION.lon,
        city: newCity.trim() || undefined,
        alertThresholdScore: newAlertEnabled ? newAlert : undefined,
      });
      if (newIsHome && !created.isHome) {
        await updateSavedLocation(created.id, { isHome: true });
      }
      setNewName('');
      setNewCity('');
      setAdding(false);
      await fetchBeaches();
    } catch (e) {
      setAddErrorMsg(e instanceof Error ? e.message : 'Please try again.');
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
    setEditCity(beach.city ?? '');
    setEditAlert(beach.alertThresholdScore ?? beach.score);
  }

  function cancelEditing() {
    setEditingId(null);
  }

  async function handleDoneEditing(id: string) {
    if (!editName.trim()) return;
    setSavingEdit(true);
    try {
      await updateSavedLocation(id, { name: editName.trim(), city: editCity.trim(), alertThresholdScore: editAlert });
      await fetchBeaches();
      setEditingId(null);
    } catch (e) {
      setSaveErrorMsg(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSavingEdit(false);
    }
  }

  function confirmRemove(beach: SavedLocation) {
    setRemoveTarget(beach);
  }

  async function handleConfirmedRemove() {
    if (!removeTarget) return;
    await deleteSavedLocation(removeTarget.id);
    fetchBeaches();
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: t.text }]}>Beaches</Text>
        <TouchableOpacity onPress={openAdd}>
          <Ionicons name="add-circle-outline" size={26} color={t.text} />
        </TouchableOpacity>
      </View>
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

            <TextInput
              value={newCity}
              onChangeText={setNewCity}
              placeholder="City (e.g. Sanibel, FL)"
              placeholderTextColor={t.muted}
              style={[styles.addInput, { borderColor: t.border, color: t.text, marginTop: 8 }]}
            />

            <TouchableOpacity style={styles.homeToggleRow} onPress={() => setNewAlertEnabled((v) => !v)} hitSlop={8}>
              <Ionicons name={newAlertEnabled ? 'checkbox' : 'square-outline'} size={20} color={t.text} />
              <Text style={[styles.homeToggleText, { color: t.text }]}>Alert me at a score threshold</Text>
            </TouchableOpacity>

            {newAlertEnabled && (
              <View style={styles.addSection}>
                <Text style={[styles.editLabel, { color: t.muted }]}>ALERT THRESHOLD</Text>
                <View style={styles.alertStepperRow}>
                  <TouchableOpacity onPress={() => adjustNewAlert(-ALERT_STEP)} style={styles.stepperBtn} hitSlop={8}>
                    <Ionicons name="arrow-down-circle-outline" size={26} color={t.text} />
                  </TouchableOpacity>
                  <Text style={[styles.alertText, { color: t.sea }]}>🔔 Alert at score {newAlert}+</Text>
                  <TouchableOpacity onPress={() => adjustNewAlert(ALERT_STEP)} style={styles.stepperBtn} hitSlop={8}>
                    <Ionicons name="arrow-up-circle-outline" size={26} color={t.text} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.homeToggleRow} onPress={() => setNewIsHome((v) => !v)} hitSlop={8}>
              <Ionicons name={newIsHome ? 'checkbox' : 'square-outline'} size={20} color={t.text} />
              <Text style={[styles.homeToggleText, { color: t.text }]}>Set as home beach</Text>
            </TouchableOpacity>

            {saving ? (
              <ActivityIndicator color={t.accent} />
            ) : (
              <Btn label="Save beach" onPress={handleAdd} style={{ marginTop: 10 }} />
            )}
          </View>
        )}

        <View style={[styles.searchBox, { backgroundColor: t.inputBg, borderColor: t.border }]}>
          <Text style={{ color: t.muted }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your beaches..."
            placeholderTextColor={t.muted}
            style={[styles.searchText, { color: t.text }]}
          />
        </View>

        <View style={styles.filtersRow}>
          {FILTERS.map((f, i) => (
            <Text
              key={f.label}
              onPress={() => setActiveFilter(i)}
              style={[
                styles.filterChip,
                { borderColor: t.border, backgroundColor: i === activeFilter ? t.navBg : t.surface, color: i === activeFilter ? t.navText : t.muted },
              ]}
            >
              {f.label}
            </Text>
          ))}
        </View>

        {loading && <ActivityIndicator color={t.accent} style={{ marginVertical: 20 }} />}
        {!loading && error && <Text style={[styles.emptyText, { color: t.accentDeep }]}>{error}</Text>}
        {!loading && !error && beaches.length === 0 && (
          <Text style={[styles.emptyText, { color: t.muted }]}>No saved beaches yet — tap + to add one.</Text>
        )}
        {!loading && !error && beaches.length > 0 && visibleBeaches.length === 0 && (
          <Text style={[styles.emptyText, { color: t.muted }]}>No beaches match this search.</Text>
        )}

        {!loading &&
          !error &&
          visibleBeaches.map((b) => (
            <View
              key={b.id}
              style={[
                styles.beachCard,
                { backgroundColor: t.surface, borderColor: b.isHome ? t.accent : t.border, borderWidth: b.isHome ? 1.5 : 1 },
              ]}
            >
              {editingId === b.id ? (
                <View style={styles.beachTop}>
                  <View style={styles.beachTopRow}>
                    <View style={styles.nameColumn}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.beachName, { color: t.text }]}>{b.name}</Text>
                        {b.isHome && (
                          <Text style={[styles.homeBadge, { backgroundColor: t.surfaceAlt, color: t.text, borderColor: t.border }]}>
                            HOME
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.cardAlertText, { color: t.sea }]}>
                        {b.alertThresholdScore != null ? `🔔 Alert at score ${b.alertThresholdScore}+` : '🔕 No alert set'}
                      </Text>
                    </View>
                    <View style={styles.scoreWrap}>
                      <Text style={[styles.scoreVal, { color: scoreColor(b.score, t) }]}>{b.score}</Text>
                      <Text style={[styles.scoreLabel, { color: t.muted }]}>SHELLCAST SCORE</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.beachTop} onPress={() => startEditing(b)} activeOpacity={0.7}>
                  <View style={styles.beachTopRow}>
                    <View style={styles.nameColumn}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.beachName, { color: t.text }]}>{b.name}</Text>
                        {b.isHome && (
                          <Text style={[styles.homeBadge, { backgroundColor: t.surfaceAlt, color: t.text, borderColor: t.border }]}>
                            HOME
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.cardAlertText, { color: t.sea }]}>
                        {b.alertThresholdScore != null ? `🔔 Alert at score ${b.alertThresholdScore}+` : '🔕 No alert set'}
                      </Text>
                    </View>
                    <View style={styles.scoreWrap}>
                      <Text style={[styles.scoreVal, { color: scoreColor(b.score, t) }]}>{b.score}</Text>
                      <Text style={[styles.scoreLabel, { color: t.muted }]}>SHELLCAST SCORE</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

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
                    <Text style={[styles.editLabel, { color: t.muted }]}>CITY</Text>
                    <TextInput
                      value={editCity}
                      onChangeText={setEditCity}
                      placeholder="e.g. Sanibel, FL"
                      placeholderTextColor={t.muted}
                      style={[styles.nameInput, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]}
                    />
                  </View>

                  <View style={styles.editSection}>
                    <Text style={[styles.editLabel, { color: t.muted }]}>ALERT THRESHOLD</Text>
                    <View style={styles.alertStepperRow}>
                      <TouchableOpacity onPress={() => adjustDraftAlert(-ALERT_STEP)} style={styles.stepperBtn} hitSlop={8}>
                        <Ionicons name="arrow-down-circle-outline" size={26} color={t.text} />
                      </TouchableOpacity>
                      <Text style={[styles.alertText, { color: t.sea }]}>🔔 Alert at score {editAlert}+</Text>
                      <TouchableOpacity onPress={() => adjustDraftAlert(ALERT_STEP)} style={styles.stepperBtn} hitSlop={8}>
                        <Ionicons name="arrow-up-circle-outline" size={26} color={t.text} />
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
              ) : null}
            </View>
          ))}
      </ScrollView>

      <ConfirmDialog
        visible={!!addErrorMsg}
        title="Could not add beach"
        message={addErrorMsg ?? undefined}
        buttons={[{ text: 'OK' }]}
        onClose={() => setAddErrorMsg(null)}
      />
      <ConfirmDialog
        visible={!!saveErrorMsg}
        title="Could not save changes"
        message={saveErrorMsg ?? undefined}
        buttons={[{ text: 'OK' }]}
        onClose={() => setSaveErrorMsg(null)}
      />
      <ConfirmDialog
        visible={!!removeTarget}
        title={removeTarget ? `Remove ${removeTarget.name}?` : ''}
        buttons={[
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: handleConfirmedRemove },
        ]}
        onClose={() => setRemoveTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: fonts.display, fontSize: 19, fontWeight: '600' },
  content: { paddingHorizontal: 14, paddingBottom: 16 },
  addBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
  addInput: { fontFamily: fonts.body, fontSize: 13, borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12 },
  addSection: { gap: 6, marginTop: 12 },
  homeToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  homeToggleText: { fontFamily: fonts.body, fontSize: 13 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 10 },
  searchText: { flex: 1, fontFamily: fonts.body, fontSize: 13 },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  filterChip: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4, borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden' },
  emptyText: { fontFamily: fonts.body, fontSize: 12, paddingVertical: 20, textAlign: 'center' },
  beachCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  beachTop: { padding: 14 },
  beachTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  nameColumn: { justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  beachName: { fontFamily: fonts.display, fontSize: 14, fontWeight: '600' },
  homeBadge: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4, borderRadius: 10, paddingVertical: 2, paddingHorizontal: 7, borderWidth: 1, overflow: 'hidden' },
  scoreWrap: { alignItems: 'flex-end', justifyContent: 'space-between' },
  scoreVal: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 30 },
  scoreLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
  cardAlertText: { fontFamily: fonts.data, fontSize: 11 },
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

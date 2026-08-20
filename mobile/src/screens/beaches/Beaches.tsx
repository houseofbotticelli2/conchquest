import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, tabularNums } from '../../theme/tokens';
import { Btn } from '../../components/Btn';
import { ListRow } from '../../components/ListRow';
import { Field } from '../../components/Field';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ShellingMap } from '../../components/ShellingMap';
import { BeachesStackParamList } from '../../navigation/types';
import { listSavedLocations, createSavedLocation, updateSavedLocation, SavedLocation } from '../../lib/api';
import { getCurrentLocation, reverseGeocodeCity, DeviceLocation } from '../../lib/location';

// Shown in place of the draggable map on web, where react-native-maps has no
// implementation -- see ShellingMap.web.tsx.
function MapUnavailableOnWeb({ color }: { color: string }) {
  return (
    <Text style={{ fontFamily: fonts.body, fontSize: 12, color, padding: 12, textAlign: 'center' }}>
      Fine-tuning a beach's exact position by dragging the pin isn't available on web -- use the mobile app.
    </Text>
  );
}

type Props = NativeStackScreenProps<BeachesStackParamList, 'Beaches'>;

// Falls back to Sanibel Island if location permission is denied or a fix
// can't be gotten.
const DEFAULT_LOCATION = { lat: 26.4615, lon: -82.1867, label: 'Sanibel Island' };
const ALERT_STEP = 1;
const DEFAULT_NEW_ALERT = 50;

const FILTERS: { label: string; favorite?: boolean; hasAlert?: boolean }[] = [
  { label: 'All' },
  { label: 'Favorite', favorite: true },
  { label: 'Has alert', hasAlert: true },
];

export function Beaches({ navigation }: Props) {
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
  const [newLocation, setNewLocation] = useState<DeviceLocation | null>(null);
  const [newAlertEnabled, setNewAlertEnabled] = useState(false);
  const [newAlert, setNewAlert] = useState(DEFAULT_NEW_ALERT);
  const [newIsFavorite, setNewIsHome] = useState(false);
  const [saving, setSaving] = useState(false);

  // Accordion: one open at a time, so the Edit button inside an expansion
  // is unambiguously about the beach above it.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addErrorMsg, setAddErrorMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);


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
      if (filter.favorite && !b.isFavorite) return false;
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
    setNewLocation(null);
    setNewAlertEnabled(false);
    setNewAlert(DEFAULT_NEW_ALERT);
    setNewIsHome(false);
    setAdding((v) => !v);

    getCurrentLocation().then((loc) => {
      if (!loc) return;
      setNewLocation(loc);
      reverseGeocodeCity(loc).then((city) => {
        if (city) setNewCity(city);
      });
    });
  }

  function handleNewLocationDragEnd(loc: DeviceLocation) {
    setNewLocation(loc);
    reverseGeocodeCity(loc).then((city) => {
      if (city) setNewCity(city);
    });
  }

  async function handleAdd() {
    if (!newName.trim() || !newCity.trim()) return;
    setSaving(true);
    try {
      const location = newLocation ?? DEFAULT_LOCATION;
      const created = await createSavedLocation({
        name: newName.trim(),
        lat: location.lat,
        lon: location.lon,
        city: newCity.trim(),
        alertThresholdScore: newAlertEnabled ? newAlert : undefined,
      });
      if (newIsFavorite && !created.isFavorite) {
        await updateSavedLocation(created.id, { isFavorite: true });
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







  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: t.text }]}>My Beaches</Text>
        <TouchableOpacity onPress={openAdd}>
          <Ionicons name="add-circle-outline" size={26} color={t.text} />
        </TouchableOpacity>
      </View>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
        {adding && (
          <View style={[styles.addBox, { backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha }, t.shadowRaised]}>
            <Field
              value={newName}
              onChangeText={setNewName}
              placeholder={`Beach name (near ${newCity.trim() || DEFAULT_LOCATION.label})`}
              style={styles.addInput}
            />

            <View style={styles.addSection}>
              <Text style={[styles.editLabel, { color: t.muted }]}>CITY</Text>
              <Text style={[styles.readOnlyValue, { color: t.text }]}>{newCity || DEFAULT_LOCATION.label}</Text>
            </View>

            <View style={styles.addSection}>
              <Text style={[styles.editLabel, { color: t.muted }]}>LOCATION (DRAG PIN TO ADJUST)</Text>
              <View style={[styles.mapBox, { borderColor: t.borderSoftAlpha }, t.shadowRaised]}>
                <ShellingMap
                  latitude={(newLocation ?? DEFAULT_LOCATION).lat}
                  longitude={(newLocation ?? DEFAULT_LOCATION).lon}
                  // getCurrentLocation() resolves asynchronously, so the map
                  // mounts with DEFAULT_LOCATION first -- this forces one
                  // remount (picking up the real coordinate as its new
                  // initialRegion) once newLocation actually resolves,
                  // without resetting position on every later drag.
                  centerKey={newLocation ? 'located' : 'pending'}
                  onCenterMarkerDragEnd={handleNewLocationDragEnd}
                  fallback={<MapUnavailableOnWeb color={t.muted} />}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.homeToggleRow} onPress={() => setNewAlertEnabled((v) => !v)} hitSlop={8}>
              <Ionicons name={newAlertEnabled ? 'checkbox' : 'square-outline'} size={20} color={t.text} />
              <Text style={[styles.homeToggleText, { color: t.text }]}>Alert me at a score threshold</Text>
            </TouchableOpacity>

            {newAlertEnabled && (
              <View style={styles.addSection}>
                <Text style={[styles.editLabel, { color: t.muted }]}>ALERT THRESHOLD</Text>
                <View style={[styles.alertStepperRow, { backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha }, t.shadowRaised]}>
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
              <Ionicons name={newIsFavorite ? 'checkbox' : 'square-outline'} size={20} color={t.text} />
              <Text style={[styles.homeToggleText, { color: t.text }]}>Add to favorites</Text>
            </TouchableOpacity>

            {saving ? (
              <ActivityIndicator color={t.accent} />
            ) : (
              <Btn label="Save beach" onPress={handleAdd} style={{ marginTop: 10 }} />
            )}
          </View>
        )}

        <View style={[styles.searchBox, { backgroundColor: t.surfaceInset, borderColor: t.borderSoftAlpha }]}>
          <Text style={{ color: t.muted }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your beaches..."
            style={styles.searchText}
          />
        </View>

        <View style={styles.filtersRow}>
          {FILTERS.map((f, i) => (
            <Text
              key={f.label}
              onPress={() => setActiveFilter(i)}
              style={[
                styles.filterChip,
                { borderColor: t.borderSoftAlpha, backgroundColor: i === activeFilter ? t.navBg : t.surfaceCardHi, color: i === activeFilter ? t.navText : t.muted },
                i === activeFilter && t.shadowRaised,
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
            <ListRow
              key={b.id}
              score={b.score}
              name={b.name}
              sub={b.city ?? undefined}
              expanded={expandedId === b.id}
              onPress={() => setExpandedId((id) => (id === b.id ? null : b.id))}
              chips={
                // The alert threshold sits where the HOME pill used to. Favourite
                // status is no longer flagged per row -- you can filter on it,
                // which is faster than scanning for a badge.
                b.alertThresholdScore != null ? (
                  <Text style={[styles.alertChip, { backgroundColor: t.surfaceInset, color: t.sea, borderColor: t.borderSoftAlpha }]}>
                    🔔 {b.alertThresholdScore}+
                  </Text>
                ) : undefined
              }
              action={<Btn label="Edit" variant="secondary" onPress={() => navigation.navigate('BeachEdit', { beach: b })} />}
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
    </View>
  );
}

const styles = StyleSheet.create({
  alertChip: {
    fontFamily: fonts.data, fontSize: 10, letterSpacing: 0.3, borderRadius: 20,
    paddingVertical: 2, paddingHorizontal: 8, borderWidth: 1, overflow: 'hidden',
  },
  expandedDetail: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: fonts.display, fontSize: 19 },
  content: { paddingHorizontal: 14, paddingBottom: 16 },
  addBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
  addInput: { fontFamily: fonts.body, fontSize: 13, borderWidth: 1, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 12 },
  addSection: { gap: 6, marginTop: 12 },
  readOnlyValue: { fontFamily: fonts.body, fontSize: 13, paddingVertical: 8 },
  mapBox: { height: 280, borderRadius: 8, overflow: 'hidden', borderWidth: 1 },
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
  beachName: { fontFamily: fonts.display, fontSize: 14 },
  homeBadge: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4, borderRadius: 10, paddingVertical: 2, paddingHorizontal: 7, borderWidth: 1, overflow: 'hidden' },
  scoreWrap: { alignItems: 'flex-end', justifyContent: 'space-between' },
  scoreVal: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 30 , ...tabularNums },
  scoreLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
  cardAlertText: { fontFamily: fonts.data, fontSize: 11 },
  editPanel: { borderTopWidth: 1, padding: 14, gap: 14 },
  editSection: { gap: 6 },
  editLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
  nameInput: { fontFamily: fonts.body, fontSize: 13, borderWidth: 1, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10 },
  alertStepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  stepperBtn: { padding: 2 },
  editActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 2 },
  alertText: { fontFamily: fonts.data, fontSize: 11, flex: 1 },
  editText: { fontFamily: fonts.data, fontSize: 11, letterSpacing: 0.4 },
});

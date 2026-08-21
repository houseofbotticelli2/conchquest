import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BeachesStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Field } from '../../components/Field';
import { Btn } from '../../components/Btn';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DestructiveLink } from '../../components/DestructiveLink';
import { ShellingMap } from '../../components/ShellingMap';
import { updateSavedLocation, deleteSavedLocation } from '../../lib/api';
import { reverseGeocodeCity } from '../../lib/location';
import type { DeviceLocation } from '../../lib/location';

const ALERT_STEP = 5;

// Mirrors the helper in Beaches.tsx. Duplicated rather than shared because it
// is three lines and exporting it from a screen would be worse.
function MapUnavailableOnWeb({ color }: { color: string }) {
  return <Text style={{ color, fontSize: 12, textAlign: 'center', padding: 20 }}>Map preview isn't available on web.</Text>;
}

type Props = NativeStackScreenProps<BeachesStackParamList, 'BeachEdit'>;

/**
 * Everything editable about a beach, on its own page (docs/TODO.md #112).
 *
 * This used to be a panel that expanded inside the list, which meant the list
 * screen carried a map, a stepper and hand-rolled scroll-into-view. Moving it
 * here costs a tap on the common "nudge the alert threshold" case, which is
 * the accepted trade for one predictable rule: expanding shows, editing is
 * deliberate.
 */
export function BeachEdit({ route, navigation }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const beach = route.params.beach;

  const [name, setName] = useState(beach.name);
  const [city, setCity] = useState(beach.city ?? '');
  const [location, setLocation] = useState(beach.location);
  const [alert, setAlert] = useState(beach.alertThresholdScore ?? beach.score);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(beach.isFavorite);
  const [deleteVisible, setDeleteVisible] = useState(false);

  function adjustAlert(delta: number) {
    setAlert((prev: number) => Math.max(0, Math.min(100, prev + delta)));
  }

  function handleDragEnd(loc: DeviceLocation) {
    setLocation({ lat: loc.lat, lon: loc.lon });
    reverseGeocodeCity(loc).then((c) => c && setCity(c));
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateSavedLocation(beach.id, {
        name: name.trim(),
        alertThresholdScore: alert,
        isFavorite: favorite,
        lat: location.lat,
        lon: location.lon,
        city,
      });
      // The list refetches on focus, so it picks this up on the way back.
      navigation.goBack();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>Edit beach</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.label, { color: t.muted }]}>NAME</Text>
          <Field value={name} onChangeText={setName} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: t.muted }]}>CITY</Text>
          <Text style={[styles.readOnly, { color: t.text }]}>{city || '—'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: t.muted }]}>LOCATION (DRAG PIN TO ADJUST)</Text>
          <View style={[styles.mapBox, { borderColor: t.borderSoftAlpha }, t.shadowRaised]}>
            <ShellingMap
              latitude={location.lat}
              longitude={location.lon}
              onCenterMarkerDragEnd={handleDragEnd}
              fallback={<MapUnavailableOnWeb color={t.muted} />}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: t.muted }]}>ALERT THRESHOLD</Text>
          <View style={[styles.stepperRow, { backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha }, t.shadowRaised]}>
            <TouchableOpacity onPress={() => adjustAlert(-ALERT_STEP)} hitSlop={8}>
              <Ionicons name="arrow-down-circle-outline" size={26} color={t.text} />
            </TouchableOpacity>
            <Text style={[styles.alertText, { color: t.sea }]}>🔔 Alert at score {alert}+</Text>
            <TouchableOpacity onPress={() => adjustAlert(ALERT_STEP)} hitSlop={8}>
              <Ionicons name="arrow-up-circle-outline" size={26} color={t.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          {/* A setting, not an action -- so it wears the alert stepper's card
              rather than a button's border, which made it the loudest thing on
              a screen whose actual point is Save. Favourites are plural and
              reversible; the label stays put and the star carries the state,
              so the row doesn't reflow under your thumb as you tap it. */}
          <TouchableOpacity
            onPress={() => setFavorite((v: boolean) => !v)}
            accessibilityRole="switch"
            accessibilityState={{ checked: favorite }}
            style={[styles.stepperRow, { backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha }, t.shadowRaised]}
          >
            <Text style={[styles.rowLabel, { color: t.text }]}>Favorite</Text>
            <Ionicons name={favorite ? 'star' : 'star-outline'} size={22} color={favorite ? t.accent : t.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          {saving ? (
            <ActivityIndicator color={t.accent} />
          ) : (
            <>
              <Btn label="Cancel" variant="ghost" onPress={() => navigation.goBack()} style={styles.actionBtn} />
              <Btn label="Save" onPress={handleSave} disabled={!name.trim()} style={styles.actionBtn} />
            </>
          )}
        </View>

        <View style={styles.deleteRow}>
          <DestructiveLink label="Remove this beach" onPress={() => setDeleteVisible(true)} />
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={deleteVisible}
        title="Remove this beach?"
        message="It comes off your saved list, along with any alert you've set for it."
        buttons={[
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteSavedLocation(beach.id);
                navigation.goBack();
              } catch (e) {
                setErrorMsg(e instanceof Error ? e.message : 'Please try again.');
              }
            },
          },
        ]}
        onClose={() => setDeleteVisible(false)}
      />

      <ConfirmDialog
        visible={!!errorMsg}
        title="Couldn't save"
        message={errorMsg ?? undefined}
        buttons={[{ text: 'OK' }]}
        onClose={() => setErrorMsg(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontFamily: fonts.display, fontSize: 22 },
  content: { padding: 20, paddingBottom: 60, gap: 18 },
  section: { gap: 6 },
  label: { fontFamily: fonts.data, fontSize: 10, letterSpacing: 1 },
  readOnly: { fontFamily: fonts.body, fontSize: 14 },
  mapBox: { height: 180, borderRadius: 10, overflow: 'hidden', borderWidth: 1 },
  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 14,
  },
  alertText: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  rowLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: { flex: 1 },
  deleteRow: { marginTop: 24, alignItems: 'center' },
});

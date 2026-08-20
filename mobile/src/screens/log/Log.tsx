import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Eyebrow } from '../../components/Eyebrow';
import { Field } from '../../components/Field';
import { Btn } from '../../components/Btn';
import { NavBar } from '../../components/NavBar';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ShellingMap } from '../../components/ShellingMap';
import { PhotoViewer } from '../../components/PhotoViewer';
import { LogStackParamList } from '../../navigation/types';
import {
  createFind,
  updateFind,
  getSpecies,
  listSpecies,
  requestPhotoUploadUrl,
  uploadPhoto,
  isPhotoContentType,
  FindCondition,
  PhotoContentType,
  Species,
  deleteFind,
} from '../../lib/api';
import { getCurrentLocation } from '../../lib/location';

type Props = NativeStackScreenProps<LogStackParamList, 'Log'>;

// Falls back to Sanibel Island if location permission is denied or a fix
// can't be obtained (same default used elsewhere in the app).
const DEFAULT_LOCATION = { lat: 26.4615, lon: -82.1867 };

const CONDITIONS: { value: FindCondition; label: string }[] = [
  { value: 'pristine', label: 'Pristine' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'fragment', label: 'Fragment' },
];

export function Log({ navigation, route }: Props) {
  const { theme: t } = useTheme();
  const editingFind = route.params?.find ?? null;
  const isEditMode = editingFind !== null;
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  const [condition, setCondition] = useState<FindCondition>(editingFind?.condition ?? 'good');
  const [notes, setNotes] = useState(editingFind?.notes ?? '');
  const [isPrivate, setIsPrivate] = useState(editingFind?.isPrivate ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [speciesQuery, setSpeciesQuery] = useState('');
  const [speciesResults, setSpeciesResults] = useState<Species[]>([]);
  const [speciesSearching, setSpeciesSearching] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);

  const [photo, setPhoto] = useState<{ uri: string; contentType: PhotoContentType } | null>(null);
  const existingPhotoUrl = editingFind?.photoUrl ?? null;
  const currentPhotoUri = photo?.uri ?? existingPhotoUrl;

  const [discardVisible, setDiscardVisible] = useState(false);
  const [photoPermMsg, setPhotoPermMsg] = useState<string | null>(null);
  const [photoSourceOpen, setPhotoSourceOpen] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lon: number } | null>(null);
  // Where the find actually happened, which is not always where you're standing
  // when you log it. Dragging the pin is also how someone decides how precisely
  // to share a spot, now that the app doesn't fuzz locations for them (#95).
  const [pinLocation, setPinLocation] = useState<{ lat: number; lon: number } | null>(
    editingFind ? editingFind.location : null
  );
  const [speciesBoxHeight, setSpeciesBoxHeight] = useState(60);

  function handleSpeciesBoxLayout(e: LayoutChangeEvent) {
    setSpeciesBoxHeight(e.nativeEvent.layout.height);
  }

  useEffect(() => {
    if (editingFind?.speciesId) {
      getSpecies(editingFind.speciesId)
        .then(setSelectedSpecies)
        .catch(() => {});
    }
  }, [editingFind?.speciesId]);

  useEffect(() => {
    if (!isEditMode) {
      getCurrentLocation().then(setDeviceLocation);
    }
  }, [isEditMode]);

  function isDirty(): boolean {
    if (isEditMode) {
      return (
        condition !== (editingFind!.condition ?? 'good') ||
        notes !== (editingFind!.notes ?? '') ||
        isPrivate !== editingFind!.isPrivate ||
        (selectedSpecies?.id ?? null) !== editingFind!.speciesId ||
        photo !== null
      );
    }
    return condition !== 'good' || notes !== '' || isPrivate !== false || selectedSpecies !== null || photo !== null;
  }

  function handleBack() {
    if (!isDirty()) {
      navigation.getParent()?.goBack();
      return;
    }
    setDiscardVisible(true);
  }

  function applyPhotoAsset(asset: ImagePicker.ImagePickerAsset) {
    const contentType = isPhotoContentType(asset.mimeType ?? '') ? (asset.mimeType as PhotoContentType) : 'image/jpeg';
    setPhoto({ uri: asset.uri, contentType });
  }

  async function handlePickPhotoFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoPermMsg('Enable photo library access in Settings to add a photo to your find.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;
    applyPhotoAsset(result.assets[0]);
  }

  async function handlePickPhotoFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPhotoPermMsg('Enable camera access in Settings to take a photo for your find.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (result.canceled) return;
    applyPhotoAsset(result.assets[0]);
  }

  useEffect(() => {
    if (!speciesQuery.trim()) {
      setSpeciesResults([]);
      return;
    }
    setSpeciesSearching(true);
    const timeout = setTimeout(() => {
      listSpecies({ search: speciesQuery.trim() })
        .then(setSpeciesResults)
        .catch(() => setSpeciesResults([]))
        .finally(() => setSpeciesSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [speciesQuery]);

  function selectSpecies(species: Species) {
    setSelectedSpecies(species);
    setSpeciesQuery('');
    setSpeciesResults([]);
  }

  async function handleSubmit() {
    if (!isEditMode && !photo) {
      setError('Add a photo to log this find.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      let photoKey: string | undefined;
      if (photo) {
        const { uploadUrl, key } = await requestPhotoUploadUrl(photo.contentType);
        await uploadPhoto(uploadUrl, photo.uri, photo.contentType);
        photoKey = key;
      }

      if (isEditMode) {
        // Only send coordinates when the pin actually moved, so an edit that
        // just fixes a typo can't nudge the location.
        const pinMoved =
          !!pinLocation &&
          (pinLocation.lat !== editingFind!.location.lat || pinLocation.lon !== editingFind!.location.lon);
        await updateFind(editingFind!.id, {
          speciesId: selectedSpecies?.id,
          condition,
          notes: notes || undefined,
          photoKey,
          isPrivate,
          ...(pinMoved ? { lat: pinLocation!.lat, lon: pinLocation!.lon } : {}),
        });
        navigation.getParent()?.goBack();
      } else {
        const location = pinLocation ?? deviceLocation ?? DEFAULT_LOCATION;
        await createFind({
          lat: location.lat,
          lon: location.lon,
          speciesId: selectedSpecies?.id,
          condition,
          notes: notes || undefined,
          photoKey: photoKey!,
          isPrivate,
        });
        navigation.navigate('LogConfirm');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${isEditMode ? 'save' : 'log'} find`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <NavBar
        title=""
        left="← Back"
        onLeft={handleBack}
        right={isEditMode ? undefined : deviceLocation ? 'Current location' : 'Sanibel'}
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        {/* The map and the photo are independent, not alternatives. An earlier
            version put them in one ternary chain, which made the photo picker
            unreachable whenever a location existed -- and since a photo is
            required, that left new finds impossible to log at all. */}
        {isEditMode || pinLocation || deviceLocation ? (
          <View style={styles.mapSection}>
            <Text style={[styles.mapHint, { color: t.muted }]}>
              Drag the pin to where you found it — handy if you're logging later, or if
              you'd rather not share the exact spot.
            </Text>
            <View style={[styles.mapBox, { borderColor: t.borderSoftAlpha }, t.shadowRaised]}>
              <ShellingMap
                latitude={(pinLocation ?? deviceLocation ?? DEFAULT_LOCATION).lat}
                longitude={(pinLocation ?? deviceLocation ?? DEFAULT_LOCATION).lon}
                latitudeDelta={0.01}
                longitudeDelta={0.01}
                // Remount once the device location resolves, so the map picks it
                // up as its initial region instead of sitting on the fallback --
                // but not on every later drag, which would fight the user.
                centerKey={pinLocation ? 'placed' : deviceLocation ? 'located' : 'pending'}
                onCenterMarkerDragEnd={(loc) => setPinLocation({ lat: loc.lat, lon: loc.lon })}
                fallback={
                  <Svg viewBox="0 0 290 88" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
                    <Rect width={290} height={88} fill="#B8C8D0" opacity={0.7} />
                    <Rect x={20} y={10} width={250} height={63} rx={6} fill="#C8D8C0" opacity={0.5} />
                    <Circle cx={145} cy={43} r={11} fill={t.accentDeep} opacity={0.9} />
                    <Circle cx={145} cy={43} r={20} fill={t.accentDeep} opacity={0.15} />
                  </Svg>
                }
              />
            </View>
          </View>
        ) : null}

        {/* Create only. Editing already reaches the picker through the shell
            thumbnail in the species row below (tap -> PhotoViewer -> Change
            photo), so a second, larger control here would be two ways to do
            one thing on the same screen. */}
        {isEditMode ? null : photo ? (
          <TouchableOpacity style={[styles.photoBox, { borderBottomColor: t.border }]} onPress={() => setPhotoSourceOpen(true)}>
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            <TouchableOpacity style={styles.photoRemove} onPress={() => setPhoto(null)}>
              <Ionicons name="close-circle" size={26} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            // Recessed + dashed reads as "put something here" -- an empty
            // dropzone at the same tone as the page just looks broken.
            style={[styles.photoBox, styles.photoBoxEmpty, { backgroundColor: t.surfaceInset, borderColor: t.borderSoftAlpha }]}
            onPress={() => setPhotoSourceOpen(true)}
          >
            <Text style={{ fontSize: 28 }}>📷</Text>
            <Text style={[styles.photoText, { color: t.muted }]}>Tap to add photo (required)</Text>
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          {error && (
            <Text style={[styles.errorText, { color: t.accentDeep, borderColor: t.accentDeep, backgroundColor: t.surfaceInset }]}>
              {error}
            </Text>
          )}

          {isEditMode ? (
            <View style={styles.photoSpeciesRow}>
              <TouchableOpacity
                onPress={() => currentPhotoUri && setPhotoViewerOpen(true)}
                style={[
                  styles.photoSquare,
                  { width: speciesBoxHeight, height: speciesBoxHeight, borderColor: t.borderSoftAlpha, backgroundColor: t.surfaceCardHi },
                  t.shadowRaised,
                ]}
              >
                {currentPhotoUri ? (
                  <Image source={{ uri: currentPhotoUri }} style={styles.photoSquareImg} />
                ) : (
                  <Text style={{ fontSize: 22 }}>🐚</Text>
                )}
              </TouchableOpacity>

              <View style={styles.speciesColumn} onLayout={handleSpeciesBoxLayout}>
                <Eyebrow>Shell species</Eyebrow>
                {selectedSpecies ? (
                  <View style={[styles.inputRow, styles.spaceBetween, { backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha }, t.shadowRaised]}>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={[styles.inputText, { color: t.text }]}>{selectedSpecies.commonName}</Text>
                      <Text style={[styles.speciesSci, { color: t.muted }]}>{selectedSpecies.scientificName}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedSpecies(null)}>
                      <Ionicons name="close-circle" size={20} color={t.muted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.inputRow, { backgroundColor: t.surfaceInset, borderColor: t.borderSoftAlpha }]}>
                    <Text style={{ color: t.muted }}>🔍</Text>
                    <TextInput
                      value={speciesQuery}
                      onChangeText={setSpeciesQuery}
                      placeholder="Search the shell library..."
                      style={[styles.inputText, styles.speciesInput]}
                    />
                    {speciesSearching && <ActivityIndicator size="small" color={t.accent} />}
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View>
              <Eyebrow>Shell species</Eyebrow>
              {selectedSpecies ? (
                <View style={[styles.inputRow, styles.spaceBetween, { backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha }, t.shadowRaised]}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={[styles.inputText, { color: t.text }]}>{selectedSpecies.commonName}</Text>
                    <Text style={[styles.speciesSci, { color: t.muted }]}>{selectedSpecies.scientificName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedSpecies(null)}>
                    <Ionicons name="close-circle" size={20} color={t.muted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.inputRow, { backgroundColor: t.surfaceInset, borderColor: t.borderSoftAlpha }]}>
                  <Text style={{ color: t.muted }}>🔍</Text>
                  <TextInput
                    value={speciesQuery}
                    onChangeText={setSpeciesQuery}
                    placeholder="Search the shell library..."
                    style={[styles.inputText, styles.speciesInput]}
                  />
                  {speciesSearching && <ActivityIndicator size="small" color={t.accent} />}
                </View>
              )}
            </View>
          )}

          {speciesResults.length > 0 && (
            <View style={[styles.resultsBox, { backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha }, t.shadowFloating]}>
              {speciesResults.map((s) => (
                <TouchableOpacity key={s.id} style={[styles.resultRow, { borderBottomColor: t.borderSoft }]} onPress={() => selectSpecies(s)}>
                  <Text style={[styles.inputText, { color: t.text }]}>{s.commonName}</Text>
                  <Text style={[styles.speciesSci, { color: t.muted }]}>{s.scientificName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {!speciesSearching && speciesQuery.trim().length > 0 && speciesResults.length === 0 && (
            <Text style={[styles.speciesEmpty, { color: t.muted }]}>No shells match "{speciesQuery.trim()}".</Text>
          )}

          <View>
            <Eyebrow>Condition</Eyebrow>
            <View style={styles.chipsRow}>
              {CONDITIONS.map((c) => {
                const active = condition === c.value;
                return (
                  <TouchableOpacity
                    key={c.value}
                    onPress={() => setCondition(c.value)}
                    style={[
                      styles.conditionChip,
                      { backgroundColor: active ? t.text : t.surfaceCardHi, borderColor: active ? t.text : t.borderSoftAlpha },
                      active ? t.shadowRaised : undefined,
                    ]}
                  >
                    <Text style={{ fontFamily: active ? fonts.bodySemiBold : fonts.body, fontSize: 12, color: active ? t.bg : t.muted }}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View>
            <Eyebrow>Location sharing</Eyebrow>
            <TouchableOpacity
              onPress={() => setIsPrivate((prev) => !prev)}
              style={[styles.inputRow, styles.spaceBetween, { backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha }, t.shadowRaised]}
            >
              <Text style={[styles.inputText, { color: t.text }]}>
                {isPrivate ? '🔒 Private - only visible to you' : '🌐 Public - visible to everyone'}
              </Text>
              <Text style={[styles.changeText, { color: t.muted }]}>CHANGE</Text>
            </TouchableOpacity>
          </View>

          <View>
            <Eyebrow>Notes</Eyebrow>
            <Field
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note..."
              multiline
              style={styles.notesBox}
            />
          </View>

          {submitting ? (
            <View style={styles.submitBtn}>
              <ActivityIndicator color={t.accent} />
            </View>
          ) : (
            <Btn
              label={isEditMode ? 'Save' : 'Log find'}
              onPress={handleSubmit}
              disabled={!isEditMode && !photo}
              style={styles.submitBtn}
            />
          )}
        </View>

        {isEditMode && (
          // Destructive actions live on the edit page, not in the list, so a
          // stray tap while scrolling can't reach them (docs/TODO.md #112).
          <View style={styles.deleteRow}>
            <Btn label="Delete this find" variant="ghost" onPress={() => setDeleteVisible(true)} />
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={deleteVisible}
        title="Delete this find?"
        message="The photo and everything logged with it are removed. This can't be undone."
        buttons={[
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteFind(editingFind!.id);
                navigation.getParent()?.goBack();
              } catch (e) {
                setDeleteErrorMsg(e instanceof Error ? e.message : 'Please try again.');
              }
            },
          },
        ]}
        onClose={() => setDeleteVisible(false)}
      />

      <ConfirmDialog
        visible={!!deleteErrorMsg}
        title="Couldn't delete this find"
        message={deleteErrorMsg ?? undefined}
        buttons={[{ text: 'OK' }]}
        onClose={() => setDeleteErrorMsg(null)}
      />

      <ConfirmDialog
        visible={discardVisible}
        title="Discard changes?"
        message="Your changes to this find have not been saved."
        buttons={[
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.getParent()?.goBack() },
        ]}
        onClose={() => setDiscardVisible(false)}
      />
      <ConfirmDialog
        visible={!!photoPermMsg}
        title="Photo access needed"
        message={photoPermMsg ?? undefined}
        buttons={[{ text: 'OK' }]}
        onClose={() => setPhotoPermMsg(null)}
      />
      <ConfirmDialog
        visible={photoSourceOpen}
        title="Add photo"
        buttons={[
          { text: 'Camera', onPress: handlePickPhotoFromCamera },
          { text: 'Photos', onPress: handlePickPhotoFromLibrary },
          { text: 'Cancel', style: 'cancel' },
        ]}
        onClose={() => setPhotoSourceOpen(false)}
      />
      <PhotoViewer
        uri={currentPhotoUri}
        visible={photoViewerOpen}
        onRequestClose={() => setPhotoViewerOpen(false)}
        onChangePhoto={() => {
          setPhotoViewerOpen(false);
          setPhotoSourceOpen(true);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mapSection: { gap: 6 },
  mapHint: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, paddingHorizontal: 20 },
  deleteRow: { marginTop: 18, alignItems: 'center' },
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 200 },
  photoBox: { height: 160, alignItems: 'center', justifyContent: 'center', gap: 6, borderBottomWidth: 1, overflow: 'hidden' },
  photoBoxEmpty: { borderBottomWidth: 0, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10, marginHorizontal: 14, marginTop: 4 },
  photoText: { fontFamily: fonts.body, fontSize: 12 },
  photoPreview: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 10, right: 10 },
  mapBox: { marginHorizontal: 14, marginVertical: 8, borderRadius: 10, overflow: 'hidden', borderWidth: 1, height: 270 },
  photoSpeciesRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  speciesColumn: { flex: 1 },
  photoSquare: { borderRadius: 10, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photoSquareImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  content: { padding: 16, gap: 14 },
  errorText: { fontFamily: fonts.body, fontSize: 12, padding: 10, borderRadius: 6, borderWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 6, paddingVertical: 11, paddingHorizontal: 12 },
  spaceBetween: { justifyContent: 'space-between' },
  inputText: { fontFamily: fonts.body, fontSize: 13, flexShrink: 1 },
  changeText: { fontFamily: fonts.data, fontSize: 11 },
  chipsRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  conditionChip: { borderRadius: 6, paddingVertical: 7, paddingHorizontal: 13, borderWidth: 1 },
  notesBox: { fontFamily: fonts.body, fontSize: 12, borderWidth: 1, borderRadius: 6, padding: 11, height: 88 },
  submitBtn: { marginBottom: 20 },
  speciesInput: { flex: 1 },
  speciesSci: { fontFamily: fonts.displayItalic, fontSize: 11, marginTop: 1 },
  resultsBox: { borderWidth: 1, borderRadius: 6, marginTop: 6, overflow: 'hidden' },
  resultRow: { paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1 },
  speciesEmpty: { fontFamily: fonts.body, fontSize: 12, marginTop: 6 },
});

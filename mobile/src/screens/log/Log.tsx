import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
        await updateFind(editingFind!.id, {
          speciesId: selectedSpecies?.id,
          condition,
          notes: notes || undefined,
          photoKey,
          isPrivate,
        });
        navigation.getParent()?.goBack();
      } else {
        const location = deviceLocation ?? DEFAULT_LOCATION;
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
        right={deviceLocation ? 'Current location' : 'Sanibel'}
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        {isEditMode ? (
          <View style={[styles.mapBox, { borderColor: t.border }]}>
            <ShellingMap
              latitude={editingFind!.location.lat}
              longitude={editingFind!.location.lon}
              latitudeDelta={0.01}
              longitudeDelta={0.01}
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
        ) : photo ? (
          <TouchableOpacity style={[styles.photoBox, { borderBottomColor: t.border }]} onPress={() => setPhotoSourceOpen(true)}>
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            <TouchableOpacity style={styles.photoRemove} onPress={() => setPhoto(null)}>
              <Ionicons name="close-circle" size={26} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.photoBox, { backgroundColor: t.surfaceAlt, borderBottomColor: t.border }]}
            onPress={() => setPhotoSourceOpen(true)}
          >
            <Text style={{ fontSize: 28 }}>📷</Text>
            <Text style={[styles.photoText, { color: t.muted }]}>Tap to add photo (required)</Text>
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          {error && (
            <Text style={[styles.errorText, { color: t.accentDeep, borderColor: t.accentDeep, backgroundColor: t.surfaceAlt }]}>
              {error}
            </Text>
          )}

          {isEditMode ? (
            <View style={styles.photoSpeciesRow}>
              <TouchableOpacity
                onPress={() => currentPhotoUri && setPhotoViewerOpen(true)}
                style={[
                  styles.photoSquare,
                  { width: speciesBoxHeight, height: speciesBoxHeight, borderColor: t.border, backgroundColor: t.surfaceAlt },
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
                  <View style={[styles.inputRow, styles.spaceBetween, { backgroundColor: t.inputBg, borderColor: t.border }]}>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={[styles.inputText, { color: t.text }]}>{selectedSpecies.commonName}</Text>
                      <Text style={[styles.speciesSci, { color: t.muted }]}>{selectedSpecies.scientificName}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedSpecies(null)}>
                      <Ionicons name="close-circle" size={20} color={t.muted} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.inputRow, { backgroundColor: t.inputBg, borderColor: t.border }]}>
                    <Text style={{ color: t.muted }}>🔍</Text>
                    <TextInput
                      value={speciesQuery}
                      onChangeText={setSpeciesQuery}
                      placeholder="Search the shell library..."
                      placeholderTextColor={t.muted}
                      style={[styles.inputText, styles.speciesInput, { color: t.text }]}
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
                <View style={[styles.inputRow, styles.spaceBetween, { backgroundColor: t.inputBg, borderColor: t.border }]}>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={[styles.inputText, { color: t.text }]}>{selectedSpecies.commonName}</Text>
                    <Text style={[styles.speciesSci, { color: t.muted }]}>{selectedSpecies.scientificName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedSpecies(null)}>
                    <Ionicons name="close-circle" size={20} color={t.muted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.inputRow, { backgroundColor: t.inputBg, borderColor: t.border }]}>
                  <Text style={{ color: t.muted }}>🔍</Text>
                  <TextInput
                    value={speciesQuery}
                    onChangeText={setSpeciesQuery}
                    placeholder="Search the shell library..."
                    placeholderTextColor={t.muted}
                    style={[styles.inputText, styles.speciesInput, { color: t.text }]}
                  />
                  {speciesSearching && <ActivityIndicator size="small" color={t.accent} />}
                </View>
              )}
            </View>
          )}

          {speciesResults.length > 0 && (
            <View style={[styles.resultsBox, { backgroundColor: t.surface, borderColor: t.border }]}>
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
                      { backgroundColor: active ? t.text : t.surface, borderColor: active ? t.text : t.border },
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
              style={[styles.inputRow, styles.spaceBetween, { backgroundColor: t.inputBg, borderColor: t.border }]}
            >
              <Text style={[styles.inputText, { color: t.text }]}>
                {isPrivate ? '🔒 Private - general vicinity shown' : '🌐 Public · exact location shown'}
              </Text>
              <Text style={[styles.changeText, { color: t.muted }]}>CHANGE</Text>
            </TouchableOpacity>
          </View>

          <View>
            <Eyebrow>Notes</Eyebrow>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note..."
              placeholderTextColor={t.muted}
              multiline
              style={[styles.notesBox, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
            />
          </View>

          {submitting ? (
            <View style={styles.submitBtn}>
              <ActivityIndicator color={t.accent} />
            </View>
          ) : (
            <Btn
              label={isEditMode ? 'Update' : 'Save'}
              onPress={handleSubmit}
              disabled={!isEditMode && !photo}
              style={styles.submitBtn}
            />
          )}
        </View>
      </ScrollView>

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
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 200 },
  photoBox: { height: 160, alignItems: 'center', justifyContent: 'center', gap: 6, borderBottomWidth: 1, overflow: 'hidden' },
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

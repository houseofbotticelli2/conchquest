import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Eyebrow } from '../../components/Eyebrow';
import { Btn } from '../../components/Btn';
import { NavBar } from '../../components/NavBar';
import { LogStackParamList } from '../../navigation/types';
import {
  createFind,
  listSpecies,
  requestPhotoUploadUrl,
  uploadPhoto,
  isPhotoContentType,
  FindCondition,
  PhotoContentType,
  Species,
} from '../../lib/api';

type Props = NativeStackScreenProps<LogStackParamList, 'Log'>;

// No GPS wired up yet — same fixed Sanibel Island location used by Score.
const DEFAULT_LOCATION = { lat: 26.4615, lon: -82.1867 };

const CONDITIONS: { value: FindCondition; label: string }[] = [
  { value: 'pristine', label: 'Pristine' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'fragment', label: 'Fragment' },
];

export function Log({ navigation }: Props) {
  const { theme: t } = useTheme();
  const [condition, setCondition] = useState<FindCondition>('good');
  const [notes, setNotes] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [speciesQuery, setSpeciesQuery] = useState('');
  const [speciesResults, setSpeciesResults] = useState<Species[]>([]);
  const [speciesSearching, setSpeciesSearching] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null);

  const [photo, setPhoto] = useState<{ uri: string; contentType: PhotoContentType } | null>(null);

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Enable photo library access in Settings to add a photo to your find.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const contentType = isPhotoContentType(asset.mimeType ?? '') ? (asset.mimeType as PhotoContentType) : 'image/jpeg';
    setPhoto({ uri: asset.uri, contentType });
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
    if (!photo) {
      setError('Add a photo to log this find.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const { uploadUrl, key } = await requestPhotoUploadUrl(photo.contentType);
      await uploadPhoto(uploadUrl, photo.uri, photo.contentType);

      await createFind({
        lat: DEFAULT_LOCATION.lat,
        lon: DEFAULT_LOCATION.lon,
        speciesId: selectedSpecies?.id,
        condition,
        notes: notes || undefined,
        photoKey: key,
        isPrivate,
      });
      navigation.navigate('LogConfirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to log find');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar title="Log a find" left="← Back" onLeft={() => navigation.getParent()?.goBack()} right="Sanibel" />
      <ScrollView>
        {photo ? (
          <View style={[styles.photoBox, { borderBottomColor: t.border }]}>
            <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            <TouchableOpacity style={styles.photoRemove} onPress={() => setPhoto(null)}>
              <Ionicons name="close-circle" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.photoBox, { backgroundColor: t.surfaceAlt, borderBottomColor: t.border }]}
            onPress={handlePickPhoto}
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
              <>
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
              </>
            )}
          </View>

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
                {isPrivate ? '🔒 Private · shown fuzzed to others' : '🌐 Public · exact location shown'}
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
            <Btn label="Log this find" onPress={handleSubmit} disabled={!photo} style={styles.submitBtn} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  photoBox: { height: 160, alignItems: 'center', justifyContent: 'center', gap: 6, borderBottomWidth: 1, overflow: 'hidden' },
  photoText: { fontFamily: fonts.body, fontSize: 12 },
  photoPreview: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 10, right: 10 },
  content: { padding: 16, gap: 14 },
  errorText: { fontFamily: fonts.body, fontSize: 12, padding: 10, borderRadius: 6, borderWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 6, paddingVertical: 11, paddingHorizontal: 12 },
  spaceBetween: { justifyContent: 'space-between' },
  inputText: { fontFamily: fonts.body, fontSize: 13, flexShrink: 1 },
  changeText: { fontFamily: fonts.data, fontSize: 11 },
  chipsRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  conditionChip: { borderRadius: 6, paddingVertical: 7, paddingHorizontal: 13, borderWidth: 1 },
  notesBox: { fontFamily: fonts.body, fontSize: 12, borderWidth: 1, borderRadius: 6, padding: 11, height: 44 },
  submitBtn: { marginBottom: 20 },
  speciesInput: { flex: 1 },
  speciesSci: { fontFamily: fonts.displayItalic, fontSize: 11, marginTop: 1 },
  resultsBox: { borderWidth: 1, borderRadius: 6, marginTop: 6, overflow: 'hidden' },
  resultRow: { paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 1 },
  speciesEmpty: { fontFamily: fonts.body, fontSize: 12, marginTop: 6 },
});

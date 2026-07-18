import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Eyebrow } from '../../components/Eyebrow';
import { Btn } from '../../components/Btn';
import { NavBar } from '../../components/NavBar';
import { LogStackParamList } from '../../navigation/types';
import { createFind, FindCondition } from '../../lib/api';

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

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await createFind({
        lat: DEFAULT_LOCATION.lat,
        lon: DEFAULT_LOCATION.lon,
        condition,
        notes: notes || undefined,
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
      <NavBar
        title="Log a find"
        leftIcon="close"
        onLeft={() => navigation.getParent()?.goBack()}
        rightIcon={submitting ? 'ellipsis-horizontal' : 'checkmark'}
        onRight={submitting ? undefined : handleSubmit}
      />
      <ScrollView>
        <TouchableOpacity style={[styles.photoBox, { backgroundColor: t.surfaceAlt, borderBottomColor: t.border }]}>
          <Text style={{ fontSize: 28 }}>📷</Text>
          <Text style={[styles.photoText, { color: t.muted }]}>Tap to add photo</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          {error && (
            <Text style={[styles.errorText, { color: t.accentDeep, borderColor: t.accentDeep, backgroundColor: t.surfaceAlt }]}>
              {error}
            </Text>
          )}

          <View>
            <Eyebrow>Shell species</Eyebrow>
            <View style={[styles.inputRow, { backgroundColor: t.inputBg, borderColor: t.border }]}>
              <Text style={{ color: t.muted }}>🔍</Text>
              <Text style={[styles.inputText, { color: t.muted }]}>Search library... (coming soon)</Text>
            </View>
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
            <Btn label="Log this find" onPress={handleSubmit} style={styles.submitBtn} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  photoBox: { height: 100, alignItems: 'center', justifyContent: 'center', gap: 6, borderBottomWidth: 1 },
  photoText: { fontFamily: fonts.body, fontSize: 12 },
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
});

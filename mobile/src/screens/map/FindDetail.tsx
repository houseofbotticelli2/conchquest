import React, { useCallback, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Eyebrow } from '../../components/Eyebrow';
import { Badge, BadgeType } from '../../components/Badge';
import { ShellingMap } from '../../components/ShellingMap';
import { PhotoViewer } from '../../components/PhotoViewer';
import { MapStackParamList } from '../../navigation/types';
import { getFind, FindDetail as FindDetailData, FindCondition } from '../../lib/api';

type Props = NativeStackScreenProps<MapStackParamList, 'FindDetail'>;

const CONDITIONS: { value: FindCondition; label: string }[] = [
  { value: 'pristine', label: 'Pristine' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'fragment', label: 'Fragment' },
];

function toBadgeType(rarity: FindDetailData['speciesRarity']): BadgeType {
  if (rarity === 'rare' || rarity === 'very_rare') return 'rare';
  if (rarity === 'uncommon') return 'uncommon';
  return 'common';
}

function formatFindDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function FindDetail({ navigation, route }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const findId = route.params?.findId;
  const [find, setFind] = useState<FindDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [speciesBoxHeight, setSpeciesBoxHeight] = useState(70);

  function handleSpeciesBoxLayout(e: LayoutChangeEvent) {
    setSpeciesBoxHeight(e.nativeEvent.layout.height);
  }

  useFocusEffect(
    useCallback(() => {
      if (!findId) {
        setFind(null);
        setLoading(false);
        setError('No find selected.');
        return;
      }
      setLoading(true);
      setError(null);
      getFind(findId)
        .then(setFind)
        .catch((e) => setError(e instanceof Error ? e.message : 'Could not load this find.'))
        .finally(() => setLoading(false));
    }, [findId])
  );

  const isPrivate = find ? (find.isOwner ? find.isPrivate : find.isLocationFuzzed) : false;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: t.accent }]}>← Map</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color={t.accent} style={{ marginTop: 40 }} />}

      {!loading && (error || !find) && (
        <Text style={[styles.emptyText, { color: t.muted }]}>{error ?? 'This find could not be found.'}</Text>
      )}

      {!loading && find && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.mapBox, { borderColor: t.border }]}>
            <ShellingMap
              latitude={find.location.lat}
              longitude={find.location.lon}
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

          <View style={styles.content}>
            <View style={styles.photoSpeciesRow}>
              <TouchableOpacity
                onPress={() => find.photoUrl && setPhotoViewerOpen(true)}
                style={[
                  styles.photoSquare,
                  { width: speciesBoxHeight, height: speciesBoxHeight, borderColor: t.border, backgroundColor: t.surfaceAlt },
                ]}
              >
                {find.photoUrl ? (
                  <Image source={{ uri: find.photoUrl }} style={styles.photoSquareImg} />
                ) : (
                  <Text style={{ fontSize: 22 }}>🐚</Text>
                )}
              </TouchableOpacity>

              <View style={styles.speciesColumn} onLayout={handleSpeciesBoxLayout}>
                <Eyebrow>Shell species</Eyebrow>
                <View style={[styles.inputRow, { backgroundColor: t.inputBg, borderColor: t.border }]}>
                  <View style={{ flexShrink: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.inputText, { color: t.text }]}>{find.speciesName ?? 'Unidentified shell'}</Text>
                      {find.speciesRarity && <Badge type={toBadgeType(find.speciesRarity)} />}
                    </View>
                    <Text style={[styles.speciesSci, { color: t.muted }]}>
                      {formatFindDate(find.foundAt)}
                      {!find.isOwner ? ` · Logged by ${find.loggedBy}` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View>
              <Eyebrow>Condition</Eyebrow>
              <View style={styles.chipsRow}>
                {CONDITIONS.map((c) => {
                  const active = find.condition === c.value;
                  return (
                    <View
                      key={c.value}
                      style={[
                        styles.conditionChip,
                        { backgroundColor: active ? t.text : t.surface, borderColor: active ? t.text : t.border },
                      ]}
                    >
                      <Text style={{ fontFamily: active ? fonts.bodySemiBold : fonts.body, fontSize: 12, color: active ? t.bg : t.muted }}>
                        {c.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View>
              <Eyebrow>Location sharing</Eyebrow>
              <View style={[styles.inputRow, { backgroundColor: t.inputBg, borderColor: t.border }]}>
                <Text style={[styles.inputText, { color: t.text }]}>
                  {isPrivate
                    ? find.isOwner
                      ? '🔒 Private - general vicinity shown'
                      : '🔒 Approximate location shown'
                    : '🌐 Public · exact location shown'}
                </Text>
              </View>
            </View>

            <View>
              <Eyebrow>Notes</Eyebrow>
              <View style={[styles.notesBox, { backgroundColor: t.inputBg, borderColor: t.border }]}>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.text }}>{find.notes || '—'}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('Species', { speciesId: find.speciesId ?? undefined })}
              style={[styles.libraryBtn, { backgroundColor: t.accent }]}
            >
              <Text style={styles.libraryBtnText}>View in library</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <PhotoViewer uri={find?.photoUrl ?? null} visible={photoViewerOpen} onRequestClose={() => setPhotoViewerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  back: { fontFamily: fonts.body, fontSize: 14 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
  mapBox: { marginHorizontal: 14, marginVertical: 8, borderRadius: 10, overflow: 'hidden', borderWidth: 1, height: 270 },
  scrollContent: { paddingBottom: 40 },
  content: { paddingHorizontal: 16, gap: 14 },
  photoSpeciesRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  speciesColumn: { flex: 1 },
  photoSquare: { borderRadius: 10, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photoSquareImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 6, paddingVertical: 11, paddingHorizontal: 12, flex: 1 },
  inputText: { fontFamily: fonts.body, fontSize: 13, flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  speciesSci: { fontFamily: fonts.data, fontSize: 11, marginTop: 3 },
  chipsRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  conditionChip: { borderRadius: 6, paddingVertical: 7, paddingHorizontal: 13, borderWidth: 1 },
  notesBox: { borderWidth: 1, borderRadius: 6, padding: 11, minHeight: 60 },
  libraryBtn: { borderRadius: 6, paddingVertical: 12, alignItems: 'center' },
  libraryBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#fff' },
});

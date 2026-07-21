import React, { useCallback, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Badge, BadgeType } from '../../components/Badge';
import { ShellingMap } from '../../components/ShellingMap';
import { MapStackParamList } from '../../navigation/types';
import { getFind, FindDetail as FindDetailData } from '../../lib/api';

type Props = NativeStackScreenProps<MapStackParamList, 'FindDetail'>;

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
        <ScrollView>
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
            <View style={styles.titleRow}>
              <View>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: t.text }]}>{find.speciesName ?? 'Unidentified shell'}</Text>
                  {find.speciesRarity && <Badge type={toBadgeType(find.speciesRarity)} />}
                </View>
                <Text style={[styles.sci, { color: t.muted }]}>
                  {formatFindDate(find.foundAt)}
                  {find.condition ? ` · ${find.condition}` : ''}
                  {!find.isOwner ? ` · Logged by ${find.loggedBy}` : ''}
                </Text>
              </View>
              <View style={[styles.iconBox, { backgroundColor: t.iconRare, borderColor: t.border }]}>
                {find.photoUrl ? (
                  <Image source={{ uri: find.photoUrl }} style={styles.iconPhoto} />
                ) : (
                  <Text style={{ fontSize: 24 }}>🐚</Text>
                )}
              </View>
            </View>

            {(find.isOwner ? find.isPrivate : find.isLocationFuzzed) && (
              <View style={[styles.privacyRow, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
                <Text>🔒</Text>
                <Text style={[styles.privacyText, { color: t.body }]}>
                  {find.isOwner ? 'Private find' : 'Approximate location'}
                </Text>
              </View>
            )}

            {find.notes && <Text style={[styles.note, { color: t.body }]}>"{find.notes}"</Text>}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Species', { speciesId: find.speciesId ?? undefined })}
                style={[styles.libraryBtn, { backgroundColor: t.accent }]}
              >
                <Text style={styles.libraryBtnText}>View in library</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareBtn, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
                <Text style={{ fontSize: 16, color: t.text }}>↗</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  back: { fontFamily: fonts.body, fontSize: 14 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
  mapBox: { marginHorizontal: 14, marginVertical: 8, borderRadius: 10, overflow: 'hidden', borderWidth: 1, height: 270 },
  content: { paddingHorizontal: 18, paddingBottom: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontFamily: fonts.display, fontSize: 21, fontWeight: '600' },
  sci: { fontFamily: fonts.data, fontSize: 11 },
  iconBox: { width: 46, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  iconPhoto: { width: '100%', height: '100%', resizeMode: 'contain' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, marginBottom: 12 },
  privacyText: { fontFamily: fonts.body, fontSize: 12 },
  note: { fontFamily: fonts.displayItalic, fontSize: 14, lineHeight: 22, marginBottom: 14 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  libraryBtn: { flex: 1, borderRadius: 6, paddingVertical: 12, alignItems: 'center' },
  libraryBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#fff' },
  shareBtn: { width: 52, borderRadius: 6, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
});

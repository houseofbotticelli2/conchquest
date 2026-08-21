import React, { useCallback, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Rect, Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/tokens';
import { Eyebrow } from '../../components/Eyebrow';
import { Field } from '../../components/Field';
import { Badge, toBadgeType } from '../../components/Badge';
import { ShellingMap } from '../../components/ShellingMap';
import { PhotoViewer } from '../../components/PhotoViewer';
import { NavBar } from '../../components/NavBar';
import { SlideUpSheet } from '../../components/SlideUpSheet';
import { SheetRow } from '../../components/SheetRow';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { MapStackParamList } from '../../navigation/types';
import { getFind, FindDetail as FindDetailData, FindCondition, ReportReason, reportFind, blockUser } from '../../lib/api';
import { formatFindDate } from '../../lib/findFormat';

type Props = NativeStackScreenProps<MapStackParamList, 'FindDetail'>;

const CONDITIONS: { value: FindCondition; label: string }[] = [
  { value: 'pristine', label: 'Pristine' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'fragment', label: 'Fragment' },
];

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'inappropriate_content', label: 'Inappropriate photo or content' },
  { value: 'harassment', label: 'Harassment or abusive language' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

export function FindDetail({ navigation, route }: Props) {
  const { theme: t } = useTheme();
  const findId = route.params?.findId;
  const [find, setFind] = useState<FindDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [speciesBoxHeight, setSpeciesBoxHeight] = useState(70);

  const [actionsOpen, setActionsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportNotes, setReportNotes] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSentVisible, setReportSentVisible] = useState(false);
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false);
  const [blockingUser, setBlockingUser] = useState(false);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  // On iOS, presenting a new Modal while the "Find options" sheet's own
  // dismiss animation is still mid-flight stacks two presentations and
  // silently fails to show (same issue Profile.tsx's avatar picker hits) --
  // these defer opening the next one until actionsOpen's onDismiss fires.
  const [pendingAction, setPendingAction] = useState<'report' | 'block' | null>(null);

  function handleSpeciesBoxLayout(e: LayoutChangeEvent) {
    setSpeciesBoxHeight(e.nativeEvent.layout.height);
  }

  function startReport() {
    setReportReason(null);
    setReportNotes('');
    setReportOpen(true);
  }

  async function submitReport() {
    if (!find || find.isOwner || !reportReason) return;
    setSubmittingReport(true);
    try {
      await reportFind(find.id, reportReason, reportNotes.trim() || undefined);
      setReportOpen(false);
      setReportSentVisible(true);
    } catch (e) {
      setActionErrorMsg(e instanceof Error ? e.message : 'Could not submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  }

  async function confirmBlock() {
    if (!find || find.isOwner) return;
    setBlockingUser(true);
    try {
      await blockUser(find.loggedByUserId);
      navigation.goBack();
    } catch (e) {
      setActionErrorMsg(e instanceof Error ? e.message : 'Could not block this user. Please try again.');
    } finally {
      setBlockingUser(false);
    }
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

  // Only ever meaningful for the owner -- a non-owner can never actually
  // reach a private find's detail page (the API hides it entirely), so
  // there's no "is this shown approximately" case to account for here.
  const isPrivate = find?.isOwner ? find.isPrivate : false;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <NavBar
        title=""
        left="← Map"
        onLeft={() => navigation.goBack()}
        rightIcon={find && !find.isOwner ? 'ellipsis-horizontal' : undefined}
        onRight={find && !find.isOwner ? () => setActionsOpen(true) : undefined}
      />

      {loading && <ActivityIndicator color={t.accent} style={{ marginTop: 40 }} />}

      {!loading && (error || !find) && (
        <Text style={[styles.emptyText, { color: t.muted }]}>{error ?? 'This find could not be found.'}</Text>
      )}

      {!loading && find && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.mapBox, { borderColor: t.borderSoftAlpha }, t.shadowRaised]}>
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
                  { width: speciesBoxHeight, height: speciesBoxHeight, borderColor: t.borderSoftAlpha, backgroundColor: t.surfaceCardHi },
                  t.shadowRaised,
                ]}
              >
                {find.photoUrl ? (
                  <Image source={{ uri: find.thumbUrl ?? find.photoUrl }} style={styles.photoSquareImg} />
                ) : (
                  <Text style={{ fontSize: 22 }}>🐚</Text>
                )}
              </TouchableOpacity>

              <View style={styles.speciesColumn} onLayout={handleSpeciesBoxLayout}>
                <Eyebrow>Shell species</Eyebrow>
                <View style={[styles.inputRow, { backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha }, t.shadowRaised]}>
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

            {find.condition && (
              <View>
                <Eyebrow>Condition</Eyebrow>
                {/* Static pill, not the full option row -- this used to render
                    every condition with one highlighted, which reads as a
                    tappable selector even though it isn't one when viewing
                    someone else's find. */}
                <View style={[styles.conditionChip, styles.conditionChipStatic, { backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha }, t.shadowRaised]}>
                  <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 12, color: t.text }}>
                    {CONDITIONS.find((c) => c.value === find.condition)?.label ?? find.condition}
                  </Text>
                </View>
              </View>
            )}

            <View>
              <Eyebrow>Location sharing</Eyebrow>
              <View style={[styles.inputRow, { backgroundColor: t.surfaceCardHi, borderColor: t.borderSoftAlpha }, t.shadowRaised]}>
                <Text style={[styles.inputText, { color: t.text }]}>
                  {isPrivate ? '🔒 Private - only visible to you' : '🌐 Public - visible to everyone'}
                </Text>
              </View>
            </View>

            <View>
              <Eyebrow>Notes</Eyebrow>
              <View style={[styles.notesBox, { backgroundColor: t.surfaceInset, borderColor: t.borderSoftAlpha }]}>
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.text }}>{find.notes || '—'}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('Species', { speciesId: find.speciesId ?? undefined })}
              style={[
                styles.libraryBtn,
                { backgroundColor: t.accent },
                { shadowColor: t.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 3 },
              ]}
            >
              <Text style={styles.libraryBtnText}>View in library</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <PhotoViewer uri={find?.photoUrl ?? null} visible={photoViewerOpen} onRequestClose={() => setPhotoViewerOpen(false)} />

      <SlideUpSheet
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        onDismiss={() => {
          if (pendingAction === 'report') startReport();
          if (pendingAction === 'block') setBlockConfirmVisible(true);
          setPendingAction(null);
        }}
        title="Find options"
      >
        <SheetRow onPress={() => {
            setPendingAction('report');
            setActionsOpen(false);
          }}>
          <Text style={[styles.sheetRowText, { color: t.text }]}>Report this find</Text>
        </SheetRow>
        <SheetRow onPress={() => {
            setPendingAction('block');
            setActionsOpen(false);
          }}>
          <Text style={[styles.sheetRowText, { color: t.accentDeep }]}>Block this user</Text>
        </SheetRow>
      </SlideUpSheet>

      <SlideUpSheet visible={reportOpen} onClose={() => setReportOpen(false)} title="Report this find">
        {REPORT_REASONS.map((r) => {
          const active = reportReason === r.value;
          return (
            <SheetRow key={r.value} onPress={() => setReportReason(r.value)}>
              <Text style={[styles.sheetRowText, { color: t.text }]}>{r.label}</Text>
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: active ? t.accent : t.border },
                ]}
              >
                {active && <View style={[styles.radioInner, { backgroundColor: t.accent }]} />}
              </View>
            </SheetRow>
          );
        })}
        <View style={styles.reportNotesSection}>
          <Eyebrow>Additional details (optional)</Eyebrow>
          <Field
            value={reportNotes}
            onChangeText={setReportNotes}
            multiline
            style={styles.reportNotesInput}
          />
        </View>
        {submittingReport ? (
          <ActivityIndicator color={t.accent} style={{ marginTop: 10 }} />
        ) : (
          <TouchableOpacity
            disabled={!reportReason}
            onPress={submitReport}
            style={[styles.libraryBtn, { backgroundColor: reportReason ? t.accent : t.border, marginTop: 10 }]}
          >
            <Text style={styles.libraryBtnText}>Submit report</Text>
          </TouchableOpacity>
        )}
      </SlideUpSheet>

      <ConfirmDialog
        visible={reportSentVisible}
        title="Report submitted"
        message="Thanks for letting us know. We'll review this find."
        buttons={[{ text: 'OK' }]}
        onClose={() => setReportSentVisible(false)}
      />

      <ConfirmDialog
        visible={blockConfirmVisible}
        title={find && !find.isOwner ? `Block ${find.loggedBy}?` : 'Block this user?'}
        message="You won't see finds from this user anymore. This can be undone later from Settings."
        buttons={[
          { text: 'Cancel', style: 'cancel' },
          { text: 'Block', style: 'destructive', onPress: confirmBlock },
        ]}
        onClose={() => setBlockConfirmVisible(false)}
      />

      <ConfirmDialog
        visible={!!actionErrorMsg}
        title="Something went wrong"
        message={actionErrorMsg ?? undefined}
        buttons={[{ text: 'OK' }]}
        onClose={() => setActionErrorMsg(null)}
      />

      {blockingUser && (
        <View style={styles.blockingOverlay}>
          <ActivityIndicator color={t.accent} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  emptyText: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
  mapBox: { marginHorizontal: 14, marginVertical: 8, borderRadius: 10, overflow: 'hidden', borderWidth: 1, height: 270 },
  scrollContent: { paddingBottom: 40 },
  content: { padding: 16, gap: 14 },
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
  conditionChipStatic: { alignSelf: 'flex-start' },
  notesBox: { borderWidth: 1, borderRadius: 6, padding: 11, minHeight: 60 },
  libraryBtn: { borderRadius: 6, paddingVertical: 12, alignItems: 'center' },
  libraryBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: '#fff' },
  sheetRowText: { fontFamily: fonts.body, fontSize: 15 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  reportNotesSection: { marginTop: 16, marginBottom: 4 },
  reportNotesInput: { fontFamily: fonts.body, fontSize: 14, borderWidth: 1, borderRadius: 6, padding: 11, minHeight: 70, marginTop: 6, textAlignVertical: 'top' },
  blockingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

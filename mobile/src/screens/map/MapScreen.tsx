import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts, scoreColor } from '../../theme/tokens';
import { Eyebrow } from '../../components/Eyebrow';
import { FindRow } from '../../components/FindRow';
import { BadgeType } from '../../components/Badge';
import { ShellingMap } from '../../components/ShellingMap';
import { SlideUpSheet } from '../../components/SlideUpSheet';
import { DateRangeSheet } from '../../components/DateRangeSheet';
import { MapStackParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthProvider';
import { listNearbyFinds, NearbyFind, NearbyFindsResult } from '../../lib/api';
import { useBeachContext } from '../../hooks/useBeachContext';

type Props = NativeStackScreenProps<MapStackParamList, 'Map'>;

const FILTERS: { label: string; rare?: boolean; today?: boolean; mine?: boolean }[] = [
  { label: 'All finds' },
  { label: 'Rare', rare: true },
  { label: 'Mine', mine: true },
  { label: 'Today', today: true },
];

// A sentinel index one past the end of FILTERS -- lets the date-range chip
// slot into the same mutually-exclusive activeFilter selection as the
// fixed pills above, instead of needing a separate "is date filter active"
// flag threaded through every filter check.
const DATE_FILTER_INDEX = FILTERS.length;

function formatRangeLabel(from: Date, to: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(from)} – ${fmt(to)}`;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

// Falls back to Sanibel Island if location permission is denied and no
// beach is nearby/selected.
const DEFAULT_LOCATION = { lat: 26.4615, lon: -82.1867, label: 'Sanibel Island' };

function toBadgeType(rarity: NearbyFind['speciesRarity']): BadgeType {
  if (rarity === 'rare' || rarity === 'very_rare') return 'rare';
  if (rarity === 'uncommon') return 'uncommon';
  return 'common';
}

function markerColorForRarity(rarity: NearbyFind['speciesRarity']): string {
  if (rarity === 'rare' || rarity === 'very_rare') return '#C4536F';
  if (rarity === 'uncommon') return '#4A8B8C';
  return '#D9B36C';
}

function formatFindDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

// Rough, not exact -- only used to decide how wide a radius to search, not
// for real distance math. One degree of latitude is ~364,000ft everywhere;
// the 1.4x buffer covers a viewport's corners, which sit further from the
// center than half of latitudeDelta/longitudeDelta alone would suggest.
const FEET_PER_DEGREE_LATITUDE = 364_000;
function regionToRadiusFeet(region: Region): number {
  const spanDegrees = Math.max(region.latitudeDelta, region.longitudeDelta);
  return Math.round((spanDegrees / 2) * FEET_PER_DEGREE_LATITUDE * 1.4);
}

const REGION_CHANGE_DEBOUNCE_MS = 400;
// Matches api.ts's listNearbyFinds default -- named here since this file
// needs to pass it explicitly (runSearch has no default parameter of its
// own, unlike the bare API function).
const DEFAULT_NEARBY_RADIUS_FEET = 16_000;

export function MapScreen({ navigation }: Props) {
  const { theme: t } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { user } = useAuth();
  const [nearbyResult, setNearbyResult] = useState<NearbyFindsResult>({ mode: 'individual', finds: [] });
  const finds: NearbyFind[] = nearbyResult.mode === 'individual' ? nearbyResult.finds : [];
  const clusters = nearbyResult.mode === 'clusters' ? nearbyResult.clusters : [];
  const [loading, setLoading] = useState(true);
  const regionChangeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks wherever was actually last searched -- either the selected
  // beach/device location, or a pan/zoom's region -- so refocusing this
  // screen can refresh data in place instead of resetting back to the
  // original location every time (the map's own camera position already
  // persists across a focus/blur cycle on its own; this keeps the data in
  // sync with it instead of fighting it).
  const lastSearchRef = useRef<{ lat: number; lon: number; radiusFeet: number } | null>(null);
  const hasFocusedOnceRef = useRef(false);
  const [activeFilter, setActiveFilter] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);

  const { beaches, selectedBeach, location, titleLabel, subLabel, pickerOpen, setPickerOpen, selectBeach } =
    useBeachContext(DEFAULT_LOCATION);

  const runSearch = useCallback((lat: number, lon: number, radiusFeet: number) => {
    lastSearchRef.current = { lat, lon, radiusFeet };
    setLoading(true);
    listNearbyFinds(lat, lon, radiusFeet)
      .then(setNearbyResult)
      .catch(() => setNearbyResult({ mode: 'individual', finds: [] }))
      .finally(() => setLoading(false));
  }, []);

  // Runs whenever the selected beach/device location changes -- always
  // resets to that location's default view, even if the map was previously
  // panned elsewhere (picking a different beach is a deliberate "start
  // over here" action).
  useEffect(() => {
    runSearch(location.lat, location.lon, DEFAULT_NEARBY_RADIUS_FEET);
  }, [location.lat, location.lon, runSearch]);

  // Refreshes data on returning to this screen (e.g. after blocking someone,
  // logging a find, or reporting a find) WITHOUT resetting back to the
  // original location -- re-searches wherever was last actually searched,
  // including a pan/zoom, since the map's own camera already stays put on
  // its own. Skips the very first focus, since the location effect above
  // just fetched.
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnceRef.current) {
        hasFocusedOnceRef.current = true;
        return;
      }
      if (lastSearchRef.current) {
        runSearch(lastSearchRef.current.lat, lastSearchRef.current.lon, lastSearchRef.current.radiusFeet);
      }
    }, [runSearch])
  );

  // Fires (debounced) after a pan/zoom settles -- searches around wherever
  // the map is now centered, with a radius derived from how far zoomed out
  // it is, instead of only ever refetching around the original beach/device
  // location. Cleared on unmount so a pending fetch never lands on an
  // already-left screen.
  useEffect(() => {
    return () => {
      if (regionChangeTimeout.current) clearTimeout(regionChangeTimeout.current);
    };
  }, []);

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      if (regionChangeTimeout.current) clearTimeout(regionChangeTimeout.current);
      regionChangeTimeout.current = setTimeout(() => {
        runSearch(region.latitude, region.longitude, regionToRadiusFeet(region));
      }, REGION_CHANGE_DEBOUNCE_MS);
    },
    [runSearch]
  );

  // Reset to the normal layout every time this screen regains focus (e.g.
  // returning from a find's detail page), so a fullscreen map never lingers
  // unexpectedly from a previous visit.
  useFocusEffect(
    useCallback(() => {
      setMapExpanded(false);
    }, [])
  );

  // CustomTabBar (in MainTabs) checks the active route's tabBarStyle to
  // decide whether to render itself at all -- this is the nested-screen way
  // to reach the parent Tab.Navigator's option from inside MapStack.
  useEffect(() => {
    navigation.getParent()?.setOptions({ tabBarStyle: mapExpanded ? { display: 'none' } : undefined });
    return () => {
      navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    };
  }, [mapExpanded, navigation]);

  // Nearby finds only carry a display-name string, not a user id, so
  // "Mine" matches on the same label the backend derives (display_name,
  // falling back to the email prefix) — best-effort without a real owner id.
  const myLabel = (user?.user_metadata?.display_name as string | undefined) ?? user?.email?.split('@')[0] ?? null;

  const visibleFinds = useMemo(() => {
    if (activeFilter === DATE_FILTER_INDEX && dateRange) {
      const fromMs = dateRange.from.getTime();
      const toMs = endOfDay(dateRange.to).getTime();
      return finds.filter((f) => {
        const t = new Date(f.foundAt).getTime();
        return t >= fromMs && t <= toMs;
      });
    }
    const filter = FILTERS[activeFilter];
    return finds.filter((f) => {
      if (filter.rare && f.speciesRarity !== 'rare' && f.speciesRarity !== 'very_rare') return false;
      if (filter.today && !isToday(f.foundAt)) return false;
      if (filter.mine && (!myLabel || f.loggedBy !== myLabel)) return false;
      return true;
    });
  }, [finds, activeFilter, myLabel, dateRange]);

  // Measured rather than guessed, since the header's real height depends on
  // the device's safe-area inset and whether subLabel is present -- the
  // pinned (non-expanded) map box needs to sit flush beneath it.
  const [headerHeight, setHeaderHeight] = useState(0);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <View style={{ flex: 1, display: mapExpanded ? 'none' : 'flex' }}>
        <View
          style={[styles.header, { paddingTop: insets.top + 12 }]}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        >
          <View>
            <Text style={[styles.title, { color: t.text }]}>{titleLabel}</Text>
            {subLabel && <Text style={[styles.titleSub, { color: t.muted }]}>{subLabel}</Text>}
          </View>
          <TouchableOpacity onPress={() => setPickerOpen(true)}>
            <Text style={{ fontSize: 20 }}>📍</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapBoxSpacer} />

        <ScrollView>
          <View style={styles.filtersRow}>
            {FILTERS.map((f, i) => (
              <Text
                key={f.label}
                onPress={() => {
                  setActiveFilter(i);
                  setDateRange(null);
                }}
                style={[
                  styles.filterChip,
                  { borderColor: t.borderSoftAlpha, backgroundColor: i === activeFilter ? t.navBg : t.surfaceCardHi, color: i === activeFilter ? t.navText : t.muted },
                  i === activeFilter && t.shadowRaised,
                ]}
              >
                {f.label}
              </Text>
            ))}
            <TouchableOpacity
              onPress={() => setDateSheetOpen(true)}
              style={[
                styles.filterChip,
                styles.dateChip,
                {
                  borderColor: t.borderSoftAlpha,
                  backgroundColor: activeFilter === DATE_FILTER_INDEX ? t.navBg : t.surfaceCardHi,
                },
                activeFilter === DATE_FILTER_INDEX && t.shadowRaised,
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={12}
                color={activeFilter === DATE_FILTER_INDEX ? t.navText : t.muted}
              />
              {dateRange && (
                <Text style={[styles.dateChipLabel, { color: activeFilter === DATE_FILTER_INDEX ? t.navText : t.muted }]}>
                  {formatRangeLabel(dateRange.from, dateRange.to)}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Eyebrow>Recent finds nearby</Eyebrow>
          </View>
          <View style={styles.list}>
            {loading && <ActivityIndicator color={t.accent} style={{ marginVertical: 12 }} />}
            {!loading && nearbyResult.mode === 'clusters' && (
              <Text style={[styles.emptyText, { color: t.muted }]}>
                Too many finds here to list individually — zoom in on the map to see them.
              </Text>
            )}
            {!loading && nearbyResult.mode === 'individual' && finds.length === 0 && (
              <Text style={[styles.emptyText, { color: t.muted }]}>No community finds nearby yet.</Text>
            )}
            {!loading && nearbyResult.mode === 'individual' && finds.length > 0 && visibleFinds.length === 0 && (
              <Text style={[styles.emptyText, { color: t.muted }]}>No finds match this filter.</Text>
            )}
            {!loading &&
              nearbyResult.mode === 'individual' &&
              visibleFinds.map((f) => (
                <FindRow
                  key={f.id}
                  icon="🐚"
                  bg={t.surfaceInset}
                  name={f.speciesName ?? 'Unidentified shell'}
                  sub=""
                  dateSuffix={formatFindDate(f.foundAt)}
                  condition={f.condition}
                  notes={f.notes}
                  badge={toBadgeType(f.speciesRarity)}
                  photoUrl={f.thumbUrl ?? f.photoUrl}
                  onPress={() => navigation.navigate('FindDetail', { findId: f.id })}
                />
              ))}
          </View>
        </ScrollView>
      </View>

      <SlideUpSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose a beach">
        <TouchableOpacity style={[styles.pickerRow, { borderTopColor: t.borderSoft }]} onPress={() => selectBeach(null)}>
          <Text style={[styles.pickerRowName, { color: t.text }]}>Current Location</Text>
        </TouchableOpacity>
        {beaches.length === 0 && <Text style={[styles.emptyPicker, { color: t.muted }]}>No saved beaches yet.</Text>}
        {beaches.map((b) => (
          <TouchableOpacity key={b.id} style={[styles.pickerRow, { borderTopColor: t.borderSoft }]} onPress={() => selectBeach(b)}>
            <View style={styles.pickerRowNameLine}>
              <Text style={[styles.pickerRowName, { color: t.text }]}>{b.name}</Text>
              {b.isHome && (
                <Text style={[styles.homeBadge, { backgroundColor: t.surfaceInset, color: t.text, borderColor: t.borderSoftAlpha }]}>HOME</Text>
              )}
            </View>
            <Text style={[styles.pickerRowScore, { color: scoreColor(b.score, t) }]}>{b.score}</Text>
          </TouchableOpacity>
        ))}
      </SlideUpSheet>

      <DateRangeSheet
        visible={dateSheetOpen}
        onClose={() => setDateSheetOpen(false)}
        from={dateRange?.from ?? null}
        to={dateRange?.to ?? null}
        onApply={(from, to) => {
          setDateRange({ from, to });
          setActiveFilter(DATE_FILTER_INDEX);
          setDateSheetOpen(false);
        }}
        onClear={() => {
          setDateRange(null);
          setActiveFilter(0);
        }}
      />

      <View
        style={[
          styles.mapBox,
          mapExpanded && styles.mapBoxExpanded,
          { borderColor: t.borderSoftAlpha },
          // Sits on the page rather than being punched into it. Skipped
          // when fullscreen -- there's no page left to sit on.
          !mapExpanded && t.shadowRaised,
          // Explicit pixel width/height rather than relying on top+bottom
          // (or left+right) to auto-resolve the size of an absolutely
          // positioned view -- that inference doesn't reliably reach the
          // native side the same way across RN versions/architectures, so
          // this spells out the exact box instead of hoping Yoga infers it.
          mapExpanded
            ? { top: 0, left: 0, width: windowWidth, height: windowHeight }
            : { top: headerHeight, left: 14, width: windowWidth - 28, height: 270 },
        ]}
      >
          <ShellingMap
            latitude={location.lat}
            longitude={location.lon}
            showsUserLocation={!selectedBeach}
            showCenterMarker={!!selectedBeach}
            markers={visibleFinds.map((f) => ({
              id: f.id,
              lat: f.location.lat,
              lon: f.location.lon,
              pinColor: markerColorForRarity(f.speciesRarity),
            }))}
            clusters={clusters.map((c, i) => ({ id: `cluster-${i}`, lat: c.lat, lon: c.lon, count: c.count }))}
            onSelectMarker={(id) => navigation.navigate('FindDetail', { findId: id })}
            onRegionChangeComplete={handleRegionChangeComplete}
            onCollapsedTap={!mapExpanded ? () => setMapExpanded(true) : undefined}
            edgeToEdge={mapExpanded}
            fallback={
              <Svg viewBox="0 0 292 155" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
                <Rect width={292} height={155} fill="#B8D4E0" />
                <Rect x={20} y={25} width={252} height={110} rx={8} fill="#C8DCC0" />
                <Rect x={30} y={35} width={115} height={75} rx={6} fill="#B8CEB0" />
                <Rect x={155} y={40} width={95} height={65} rx={6} fill="#BCD0B4" />
                <Rect x={0} y={120} width={292} height={35} fill="#A8C0CC" opacity={0.6} />
                <Rect x={8} y={5} width={276} height={20} rx={5} fill="rgba(242,236,228,0.95)" />
                <SvgText x={18} y={18} fontSize={10} fill={t.accent} fontWeight="600">
                  Score 78 · Sanibel Island
                </SvgText>
                <Circle cx={108} cy={78} r={13} fill={t.accent} opacity={0.9} />
                <SvgText x={108} y={82} textAnchor="middle" fontSize={10} fill="white">
                  3
                </SvgText>
                <Circle cx={183} cy={63} r={10} fill={t.accentDeep} opacity={0.9} />
                <SvgText x={183} y={67} textAnchor="middle" fontSize={9} fill="white">
                  1
                </SvgText>
                <Circle cx={148} cy={93} r={9} fill={t.sea} opacity={0.9} />
                <SvgText x={148} y={97} textAnchor="middle" fontSize={9} fill="white">
                  2
                </SvgText>
                <Circle cx={73} cy={56} r={9} fill="#D9B36C" opacity={0.9} />
                <SvgText x={73} y={60} textAnchor="middle" fontSize={9} fill="white">
                  1
                </SvgText>
                <Circle cx={123} cy={103} r={7} fill={t.text} />
                <Circle cx={123} cy={103} r={13} fill={t.text} opacity={0.2} />
              </Svg>
            }
          />
        {mapExpanded && (
          <TouchableOpacity
            style={[styles.collapseBtn, { bottom: insets.bottom + 20 }]}
            onPress={() => setMapExpanded(false)}
            hitSlop={8}
          >
            <Ionicons name="contract" size={16} color="#1a2e35" />
            <Text style={styles.collapseBtnLabel}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: fonts.display, fontSize: 18 },
  titleSub: { fontFamily: fonts.data, fontSize: 11 },
  // Positioned absolutely (relative to `screen`) rather than sitting inline
  // in the scrollable content, so it can grow from a pinned 270px box into a
  // fullscreen overlay without remounting the underlying MapView.
  mapBox: { position: 'absolute', borderRadius: 10, overflow: 'hidden', borderWidth: 1, zIndex: 1 },
  mapBoxExpanded: { borderRadius: 0, borderWidth: 0, zIndex: 10 },
  // Reserves the same vertical space the pinned map box occupies, so the
  // filters/list content below starts in the right place.
  mapBoxSpacer: { height: 280 },
  collapseBtn: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  collapseBtnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: '#1a2e35' },
  filtersRow: { paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', gap: 6 },
  filterChip: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4, borderWidth: 1, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, overflow: 'hidden' },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateChipLabel: { fontFamily: fonts.data, fontSize: 9, letterSpacing: 0.4 },
  sectionHeader: { paddingHorizontal: 14, paddingBottom: 4 },
  list: { paddingHorizontal: 14, paddingBottom: 16 },
  emptyText: { fontFamily: fonts.body, fontSize: 12, paddingVertical: 12 },
  emptyPicker: { fontFamily: fonts.body, fontSize: 12, paddingVertical: 12 },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  pickerRowName: { fontFamily: fonts.bodySemiBold, fontSize: 14 },
  pickerRowNameLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerRowScore: { fontFamily: fonts.displayBold, fontSize: 18 },
  homeBadge: {
    fontFamily: fonts.data,
    fontSize: 9,
    letterSpacing: 0.4,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

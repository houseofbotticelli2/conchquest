import React, { useRef, useState } from 'react';
import { StyleSheet, ViewStyle, StyleProp, TouchableOpacity, TouchableWithoutFeedback, View, Text } from 'react-native';
import MapView, { Marker, Region, LatLng } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme/tokens';

// The one colour for a location pin, anywhere in the app.
export const LOCATION_PIN_COLOR = '#D32F2F';

/**
 * Community find pins, by rarity: gold -> teal -> plum.
 *
 * Rare is deliberately not near LOCATION_PIN_COLOR -- at pin size on satellite
 * imagery a reddish rare pin is indistinguishable from "this is the spot you're
 * placing". Exported so the Help legend and the map read from one list; a
 * legend that can drift from the map is worse than no legend.
 */
export const FIND_PIN_COLORS = {
  rare: '#7B4B8A',
  uncommon: '#4A8B8C',
  common: '#D9B36C',
} as const;

export interface ShellingMapMarker {
  id: string;
  lat: number;
  lon: number;
  pinColor?: string;
}

// A grouped-count bubble shown in place of individual pins once an area has
// too many finds to render legibly -- see /api/finds/nearby's cluster mode.
export interface ShellingMapCluster {
  id: string;
  lat: number;
  lon: number;
  count: number;
}

export interface ShellingMapProps {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
  markers?: ShellingMapMarker[];
  onSelectMarker?: (id: string) => void;
  // Rendered instead of `markers` when the caller is in clustered mode --
  // the two are mutually exclusive in practice (a given /nearby response is
  // either individual finds or clusters, never both).
  clusters?: ShellingMapCluster[];
  // Fires after a pan/zoom gesture settles (not on every frame) -- used by
  // the Map screen to refetch finds for whatever's now visible, instead of
  // a fixed radius around one fixed point.
  onRegionChangeComplete?: (region: Region) => void;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  // Renders the native "blue dot" at the device's real GPS position
  // (separate from the latitude/longitude center, which may be a chosen
  // beach far from where the user actually is).
  showsUserLocation?: boolean;
  // Whether to drop a pin at the given latitude/longitude. Usually left on,
  // but turned off when showsUserLocation already marks that same spot (the
  // live map center) to avoid a redundant overlapping pin.
  showCenterMarker?: boolean;
  // Makes the center marker draggable and reports the new coordinate on
  // release -- used by the add/edit beach flows to let the user fine-tune a
  // beach's exact location. Unused (no-op) when showCenterMarker is false.
  onCenterMarkerDragEnd?: (coords: { lat: number; lon: number }) => void;
  // Draggable mode deliberately keeps a constant map key (see below) so a
  // drag doesn't reset the user's zoom/pan -- but that also means the
  // camera is only ever set once, from whatever latitude/longitude happens
  // to be current at first mount. If the initial coordinate comes from an
  // async source (e.g. getCurrentLocation()), the map can end up stuck on
  // a placeholder/fallback location forever, since a later prop update
  // alone won't move the camera. Pass a value here that changes exactly
  // once -- when the real location resolves -- to force one intentional
  // remount at that point, then stays stable through actual drags.
  centerKey?: string;
  // Fires on any tap on the map surface itself -- used by the Map screen to
  // expand a collapsed map to fullscreen on first touch. Rendered behind
  // (i.e. z-order below) the layers/recenter buttons below, so it never
  // swallows their taps. Unset (default) leaves the map's normal gestures
  // completely alone.
  onCollapsedTap?: () => void;
  // True once the map is genuinely edge-to-edge (no longer inset in a small
  // box with its own margin from the screen edge) -- pushes the layers/
  // recenter buttons out past the safe-area insets instead of sitting flush
  // against the notch/home-indicator area.
  edgeToEdge?: boolean;
  style?: StyleProp<ViewStyle>;
  // Web-only fallback content, unused on native -- kept in the shared prop
  // type so call sites don't need platform checks of their own.
  fallback?: React.ReactNode;
}

export function ShellingMap({
  latitude,
  longitude,
  latitudeDelta = 0.05,
  longitudeDelta = 0.05,
  markers = [],
  onSelectMarker,
  clusters = [],
  onRegionChangeComplete,
  scrollEnabled = true,
  zoomEnabled = true,
  showsUserLocation = false,
  showCenterMarker = true,
  onCenterMarkerDragEnd,
  centerKey,
  onCollapsedTap,
  edgeToEdge = false,
  style,
}: ShellingMapProps) {
  const region: Region = { latitude, longitude, latitudeDelta, longitudeDelta };
  const mapRef = useRef<MapView>(null);
  const insets = useSafeAreaInsets();
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('hybrid');

  function handleCenterMarkerDragEnd(coordinate: LatLng) {
    onCenterMarkerDragEnd?.({ lat: coordinate.latitude, lon: coordinate.longitude });
  }

  function recenterOnMarker() {
    mapRef.current?.animateToRegion(region, 300);
  }

  function toggleMapType() {
    setMapType((prev) => (prev === 'standard' ? 'hybrid' : 'standard'));
  }

  return (
    <>
      <MapView
        ref={mapRef}
        // Remount (instead of using the controlled `region` prop) when the
        // center changes -- e.g. switching from device location to a chosen
        // beach -- so the map recenters without fighting the user's own
        // pan/zoom gestures the rest of the time. In draggable-pin mode,
        // remounting on every lat/lon change would fight the user's own
        // drags, so it's pinned to `centerKey` instead (falling back to a
        // constant if the caller doesn't pass one) -- callers can use that
        // to force exactly one remount once an async initial location
        // resolves, without resetting position on every subsequent drag.
        key={onCenterMarkerDragEnd ? (centerKey ?? 'draggable') : `${latitude.toFixed(4)},${longitude.toFixed(4)}`}
        style={[styles.map, style]}
        initialRegion={region}
        scrollEnabled={scrollEnabled}
        zoomEnabled={zoomEnabled}
        showsUserLocation={showsUserLocation}
        mapType={mapType}
        onRegionChangeComplete={onRegionChangeComplete}
      >
        {showCenterMarker && (
          <Marker
            coordinate={{ latitude, longitude }}
            // Red specifically while draggable (add/edit beach) -- a beta
            // tester reported losing the dark navy pin while dragging it
            // across hybrid/satellite map imagery. Left as the original
            // dark color when not draggable (Score/Map's read-only beach
            // view), since red there would clash with the reddish
            // rare-find markers already on those maps.
            // One colour for "this is the place", draggable or not. It used to
            // be red only while draggable and dark navy otherwise, which read as
            // two different kinds of pin to testers when it is the same thing --
            // and the navy was hard to pick out against satellite imagery, which
            // is why the draggable one was made red in the first place.
            pinColor={LOCATION_PIN_COLOR}
            draggable={!!onCenterMarkerDragEnd}
            onDragEnd={(e) => handleCenterMarkerDragEnd(e.nativeEvent.coordinate)}
          />
        )}
        {markers.map((m) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.lat, longitude: m.lon }}
            pinColor={m.pinColor}
            onPress={() => onSelectMarker?.(m.id)}
          />
        ))}
        {clusters.map((c) => (
          <Marker key={c.id} coordinate={{ latitude: c.lat, longitude: c.lon }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.clusterBubble}>
              <Text style={styles.clusterBubbleText}>{c.count}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
      {onCollapsedTap && (
        <TouchableWithoutFeedback onPress={onCollapsedTap}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      )}
      <TouchableOpacity
        style={[styles.mapTypeBtn, { top: 10 + (edgeToEdge ? insets.top : 0), right: 10 + (edgeToEdge ? insets.right : 0) }]}
        onPress={toggleMapType}
        hitSlop={8}
      >
        <Ionicons name="layers" size={20} color="#1a2e35" />
      </TouchableOpacity>
      {showCenterMarker && (
        <TouchableOpacity
          style={[styles.recenterBtn, { bottom: 10 + (edgeToEdge ? insets.bottom : 0), right: 10 + (edgeToEdge ? insets.right : 0) }]}
          onPress={recenterOnMarker}
          hitSlop={8}
        >
          <Ionicons name="locate" size={20} color="#1a2e35" />
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: '100%' },
  clusterBubble: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 6,
    backgroundColor: '#4A8B8C',
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  clusterBubbleText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: 'white' },
  recenterBtn: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  mapTypeBtn: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
});

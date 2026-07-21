import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

export interface ShellingMapMarker {
  id: string;
  lat: number;
  lon: number;
  pinColor?: string;
}

export interface ShellingMapProps {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
  markers?: ShellingMapMarker[];
  onSelectMarker?: (id: string) => void;
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
  scrollEnabled = true,
  zoomEnabled = true,
  showsUserLocation = false,
  showCenterMarker = true,
  style,
}: ShellingMapProps) {
  const region: Region = { latitude, longitude, latitudeDelta, longitudeDelta };

  return (
    <MapView
      // Remount (instead of using the controlled `region` prop) when the
      // center changes -- e.g. switching from device location to a chosen
      // beach -- so the map recenters without fighting the user's own
      // pan/zoom gestures the rest of the time.
      key={`${latitude.toFixed(4)},${longitude.toFixed(4)}`}
      style={[styles.map, style]}
      initialRegion={region}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
      showsUserLocation={showsUserLocation}
    >
      {showCenterMarker && <Marker coordinate={{ latitude, longitude }} pinColor="#1a2e35" />}
      {markers.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.lat, longitude: m.lon }}
          pinColor={m.pinColor}
          onPress={() => onSelectMarker?.(m.id)}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: '100%' },
});

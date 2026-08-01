import React, { useRef, useState } from 'react';
import { StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import MapView, { Marker, Region, LatLng } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

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
  // Makes the center marker draggable and reports the new coordinate on
  // release -- used by the add/edit beach flows to let the user fine-tune a
  // beach's exact location. Unused (no-op) when showCenterMarker is false.
  onCenterMarkerDragEnd?: (coords: { lat: number; lon: number }) => void;
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
  onCenterMarkerDragEnd,
  style,
}: ShellingMapProps) {
  const region: Region = { latitude, longitude, latitudeDelta, longitudeDelta };
  const mapRef = useRef<MapView>(null);
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
        // pan/zoom gestures the rest of the time. Skipped in draggable-pin
        // mode: there, every lat/lon change comes from the marker's own drag
        // (fed back through the same props), so remounting on every drag
        // would reset the user's zoom/pan right after they set it.
        key={onCenterMarkerDragEnd ? 'draggable' : `${latitude.toFixed(4)},${longitude.toFixed(4)}`}
        style={[styles.map, style]}
        initialRegion={region}
        scrollEnabled={scrollEnabled}
        zoomEnabled={zoomEnabled}
        showsUserLocation={showsUserLocation}
        mapType={mapType}
      >
        {showCenterMarker && (
          <Marker
            coordinate={{ latitude, longitude }}
            pinColor="#1a2e35"
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
      </MapView>
      <TouchableOpacity style={styles.mapTypeBtn} onPress={toggleMapType} hitSlop={8}>
        <Ionicons name="layers" size={20} color="#1a2e35" />
      </TouchableOpacity>
      {showCenterMarker && (
        <TouchableOpacity style={styles.recenterBtn} onPress={recenterOnMarker} hitSlop={8}>
          <Ionicons name="locate" size={20} color="#1a2e35" />
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: '100%' },
  recenterBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
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
    right: 10,
    top: 10,
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

import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { reverseGeocode as reverseGeocodeBackend } from './api';

export type LocationPermissionResult = 'granted' | 'denied';

export async function requestLocationPermission(): Promise<LocationPermissionResult> {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.status === 'granted') return 'granted';

  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.status === 'granted' ? 'granted' : 'denied';
}

export interface DeviceLocation {
  lat: number;
  lon: number;
}

// Returns null if permission isn't granted or the device can't get a fix --
// callers should fall back to a default location in that case.
export async function getCurrentLocation(): Promise<DeviceLocation | null> {
  const permission = await requestLocationPermission();
  if (permission !== 'granted') return null;

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: position.coords.latitude, lon: position.coords.longitude };
  } catch {
    return null;
  }
}

// Best-effort city name for a coordinate. Returns null if it fails or
// nothing usable comes back -- callers should treat that as "leave it
// blank", not an error. On native (iOS/Android) this reverse-geocodes
// on-device for free; on web, expo-location's reverse geocoding is
// unimplemented (throws unconditionally), so it goes through a small
// backend endpoint that calls OpenWeather's geocoding API instead.
export async function reverseGeocodeCity(location: DeviceLocation): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return await reverseGeocodeBackend(location.lat, location.lon);
    } catch {
      return null;
    }
  }

  try {
    const results = await Location.reverseGeocodeAsync({ latitude: location.lat, longitude: location.lon });
    const first = results[0];
    return first ? (first.city ?? first.subregion ?? first.region ?? null) : null;
  } catch {
    return null;
  }
}

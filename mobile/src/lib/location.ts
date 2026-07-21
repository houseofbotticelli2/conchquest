import * as Location from 'expo-location';

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

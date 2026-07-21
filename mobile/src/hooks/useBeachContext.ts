import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { listSavedLocations, SavedLocation } from '../lib/api';
import { getCurrentLocation, reverseGeocodeCity, DeviceLocation } from '../lib/location';

// How close (in feet) you need to be to a saved beach for it to auto-select
// instead of showing "No Beach" -- generous enough to absorb typical GPS
// drift on Location.Accuracy.Balanced.
const NEARBY_RADIUS_FEET = 500;
const EARTH_RADIUS_FEET = 20_902_231;

function distanceFeet(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_FEET * Math.asin(Math.sqrt(h));
}

type Mode = { kind: 'auto' } | { kind: 'beach'; id: string } | { kind: 'current' };

export interface BeachContext {
  beaches: SavedLocation[];
  selectedBeach: SavedLocation | null;
  location: { lat: number; lon: number };
  titleLabel: string;
  subLabel: string | null;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean) => void;
  selectBeach: (beach: SavedLocation | null) => void;
}

// Shared "which beach am I looking at" logic behind Shellcast's and Map's
// pin picker: auto-snaps to a saved beach within NEARBY_RADIUS_FEET of the
// device's GPS fix, falls back to reverse-geocoding the current city when
// no beach is nearby, and lets the user override either via the picker.
export function useBeachContext(defaultLocation: { lat: number; lon: number }): BeachContext {
  const [beaches, setBeaches] = useState<SavedLocation[]>([]);
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'auto' });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [geocodedCity, setGeocodedCity] = useState<string | null>(null);

  useEffect(() => {
    getCurrentLocation().then(setDeviceLocation);
  }, []);

  useFocusEffect(
    useCallback(() => {
      listSavedLocations()
        .then(setBeaches)
        .catch(() => setBeaches([]));
    }, [])
  );

  let selectedBeach: SavedLocation | null = null;
  if (mode.kind === 'beach') {
    selectedBeach = beaches.find((b) => b.id === mode.id) ?? null;
  } else if (mode.kind === 'auto' && deviceLocation) {
    let nearest: SavedLocation | null = null;
    let nearestDist = Infinity;
    for (const b of beaches) {
      const d = distanceFeet(deviceLocation, b.location);
      if (d <= NEARBY_RADIUS_FEET && d < nearestDist) {
        nearest = b;
        nearestDist = d;
      }
    }
    selectedBeach = nearest;
  }

  const location = selectedBeach ? selectedBeach.location : (deviceLocation ?? defaultLocation);

  useEffect(() => {
    if (selectedBeach || !deviceLocation) {
      setGeocodedCity(null);
      return;
    }
    let cancelled = false;
    reverseGeocodeCity(deviceLocation).then((city) => {
      if (!cancelled) setGeocodedCity(city);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedBeach, deviceLocation?.lat, deviceLocation?.lon]);

  function selectBeach(beach: SavedLocation | null) {
    setMode(beach ? { kind: 'beach', id: beach.id } : { kind: 'current' });
    setPickerOpen(false);
  }

  return {
    beaches,
    selectedBeach,
    location,
    titleLabel: selectedBeach ? selectedBeach.name : 'No Beach',
    subLabel: selectedBeach ? selectedBeach.city : geocodedCity,
    pickerOpen,
    setPickerOpen,
    selectBeach,
  };
}

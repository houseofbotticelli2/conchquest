export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
  role: 'user' | 'admin';
  restrictShellingToDaylight: boolean;
}

export interface TideEvent {
  type: 'high' | 'low';
  time: string; // ISO 8601
  heightFt: number;
}

export interface TideConditions {
  stationId: string;
  stationName: string;
  distanceFeet: number;
  currentLevelFt: number | null;
  percentToNextExtreme: number | null; // 0 = at previous extreme, 100 = at next
  movement: 'rising' | 'falling' | 'slack' | 'unknown';
  nextEvents: TideEvent[];
}

export interface WindConditions {
  speedMph: number;
  gustMph: number | null;
  directionDeg: number;
  directionCompass: string;
}

export interface WaveConditions {
  heightFt: number | null;
  periodSec: number | null;
  directionDeg: number | null;
  stationId: string | null;
  distanceFeet: number | null;
  observedAt: string | null;
  stale: boolean;
}

export interface WeatherConditions {
  tempF: number | null;
  conditions: string | null;
  sunrise: string; // ISO 8601
  sunset: string; // ISO 8601
  humidity: number | null; // percent, 0-100
  uvIndex: number | null; // null when unavailable (e.g. future days, or the UV endpoint failing)
}

export interface MoonConditions {
  phaseName: string;
  phaseFraction: number; // 0-1
  illumination: number; // 0-1
  ageDays: number;
  isSpringTide: boolean;
}

export interface NormalizedConditions {
  location: { lat: number; lon: number };
  tide: TideConditions | null;
  wind: WindConditions;
  waves: WaveConditions;
  weather: WeatherConditions;
  moon: MoonConditions;
  meta: {
    fetchedAt: string;
    expiresAt: string;
    cacheHit: boolean;
    // The instant conditions/score are actually anchored to -- the next low
    // tide, not necessarily "fetchedAt" -- so callers can pass this into
    // computeShellingScore's `now` param instead of the real wall-clock time.
    referenceTime: string;
  };
}

export interface ScoreFactor {
  key: string;
  label: string;
  points: number;
  maxPoints: number;
  explanation: string;
}

export interface ShellingScoreResult {
  score: number;
  confidence: 'low' | 'medium' | 'high';
  bestWindow: {
    start: string;
    end: string;
    lowTideTime: string;
    reason: string;
    // Whether this specific window falls entirely within daylight -- true
    // regardless of the user's own restrictShellingToDaylight preference, so
    // the UI can show a "bring a light" hint even when night windows are
    // allowed.
    isDaylight: boolean;
  } | null;
  // Echoes whether this result respected the daylight restriction, so the
  // client knows how to interpret a null bestWindow (no low tide found at
  // all vs. one that only exists at night) without a separate profile fetch.
  restrictShellingToDaylight: boolean;
  explanation: string;
  factors: ScoreFactor[];
  conditions: NormalizedConditions;
}

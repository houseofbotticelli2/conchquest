export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
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
  } | null;
  explanation: string;
  factors: ScoreFactor[];
  conditions: NormalizedConditions;
}

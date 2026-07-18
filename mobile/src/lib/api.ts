import { supabase } from './supabase';

// Matches api/src/routes' current default (railway.json's deployed dev
// environment) — swap to http://localhost:3000 for local backend testing.
const API_BASE_URL = 'https://conchquest-api-dev.up.railway.app';

export class ApiError extends Error {}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError('Not logged in');

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // leave json null — fall through to the generic error below
  }

  if (!res.ok) {
    const message = (json as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new ApiError(message);
  }
  return json as T;
}

// Mirrors api/src/types/index.ts — kept in sync by hand since mobile and
// api are separate packages.
export interface TideEvent {
  type: 'high' | 'low';
  time: string;
  heightFt: number;
}

export interface NormalizedConditions {
  location: { lat: number; lon: number };
  tide: {
    stationName: string;
    distanceFeet: number;
    currentLevelFt: number | null;
    movement: 'rising' | 'falling' | 'slack' | 'unknown';
    nextEvents: TideEvent[];
  };
  wind: { speedMph: number; gustMph: number | null; directionDeg: number; directionCompass: string };
  waves: { heightFt: number | null; periodSec: number | null; directionDeg: number | null; stale: boolean };
  weather: { tempF: number | null; conditions: string | null; sunrise: string; sunset: string };
  moon: { phaseName: string; illumination: number; isSpringTide: boolean };
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
  bestWindow: { start: string; end: string; reason: string } | null;
  explanation: string;
  factors: ScoreFactor[];
  conditions: NormalizedConditions;
}

export function getScore(lat: number, lon: number): Promise<ShellingScoreResult> {
  return apiFetch<ShellingScoreResult>(`/api/score?lat=${lat}&lon=${lon}`);
}

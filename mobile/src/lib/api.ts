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
  } | null;
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

export type FindCondition = 'pristine' | 'good' | 'fair' | 'poor' | 'fragment';

export interface Find {
  isOwner: true;
  id: string;
  speciesId: string | null;
  speciesName: string | null;
  speciesRarity: BadgeRarity | null;
  location: { lat: number; lon: number };
  foundAt: string;
  condition: FindCondition | null;
  notes: string | null;
  photoUrl: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityFind {
  isOwner: false;
  id: string;
  speciesId: string | null;
  speciesName: string | null;
  speciesRarity: BadgeRarity | null;
  loggedBy: string;
  location: { lat: number; lon: number };
  isLocationFuzzed: boolean;
  foundAt: string;
  condition: FindCondition | null;
  notes: string | null;
  photoUrl: string | null;
}

export type FindDetail = Find | CommunityFind;

export interface CreateFindInput {
  lat: number;
  lon: number;
  speciesId?: string;
  condition?: FindCondition;
  notes?: string;
  photoKey: string;
  isPrivate?: boolean;
}

export interface UpdateFindInput {
  speciesId?: string;
  condition?: FindCondition;
  notes?: string;
  photoKey?: string;
  isPrivate?: boolean;
}

export function createFind(input: CreateFindInput): Promise<Find> {
  return apiFetch<Find>('/api/finds', { method: 'POST', body: JSON.stringify(input) });
}

export function updateFind(id: string, input: UpdateFindInput): Promise<Find> {
  return apiFetch<Find>(`/api/finds/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function getFind(id: string): Promise<FindDetail> {
  return apiFetch<FindDetail>(`/api/finds/${id}`);
}

const ALLOWED_PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'] as const;
export type PhotoContentType = (typeof ALLOWED_PHOTO_CONTENT_TYPES)[number];

export function isPhotoContentType(value: string): value is PhotoContentType {
  return (ALLOWED_PHOTO_CONTENT_TYPES as readonly string[]).includes(value);
}

export function requestPhotoUploadUrl(
  contentType: PhotoContentType,
  purpose: 'find' | 'avatar' = 'find'
): Promise<{ uploadUrl: string; key: string }> {
  return apiFetch('/api/uploads/presign', { method: 'POST', body: JSON.stringify({ contentType, purpose }) });
}

export async function uploadPhoto(uploadUrl: string, uri: string, contentType: PhotoContentType): Promise<void> {
  const photoBlob = await (await fetch(uri)).blob();
  const res = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: photoBlob });
  if (!res.ok) {
    throw new ApiError(`Photo upload failed (${res.status})`);
  }
}

export function listMyFinds(limit = 20): Promise<Find[]> {
  return apiFetch<Find[]>(`/api/finds?limit=${limit}`);
}

export interface FindStats {
  totalFinds: number;
  rareFinds: number;
  speciesCount: number;
}

export function getFindStats(): Promise<FindStats> {
  return apiFetch<FindStats>('/api/finds/stats');
}

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'very_rare';

export interface NearbyFind {
  id: string;
  speciesId: string | null;
  speciesName: string | null;
  speciesRarity: BadgeRarity | null;
  loggedBy: string;
  location: { lat: number; lon: number };
  isLocationFuzzed: boolean;
  foundAt: string;
  condition: FindCondition | null;
  notes: string | null;
  photoUrl: string | null;
  distanceFeet: number;
}

export function listNearbyFinds(lat: number, lon: number, radiusFeet = 16_000): Promise<NearbyFind[]> {
  return apiFetch<NearbyFind[]>(`/api/finds/nearby?lat=${lat}&lon=${lon}&radiusFeet=${radiusFeet}`);
}

export interface Species {
  id: string;
  commonName: string;
  scientificName: string;
  family: string | null;
  genus: string | null;
  rarity: BadgeRarity;
  description: string | null;
  habitat: string | null;
  regionalOccurrence: string[];
  seasonality: string | null;
  imageUrl: string | null;
}

export function listSpecies(params: { search?: string; rarity?: BadgeRarity; region?: string } = {}): Promise<Species[]> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.rarity) query.set('rarity', params.rarity);
  if (params.region) query.set('region', params.region);
  const qs = query.toString();
  return apiFetch<Species[]>(`/api/species${qs ? `?${qs}` : ''}`);
}

export function getSpecies(id: string): Promise<Species> {
  return apiFetch<Species>(`/api/species/${id}`);
}

export interface SavedLocation {
  id: string;
  name: string;
  location: { lat: number; lon: number };
  city: string | null;
  notes: string | null;
  alertThresholdScore: number | null;
  isHome: boolean;
  createdAt: string;
  score: number;
  confidence: 'low' | 'medium' | 'high';
  conditionSummary: string;
}

export interface CreateSavedLocationInput {
  name: string;
  lat: number;
  lon: number;
  city?: string;
  notes?: string;
  alertThresholdScore?: number;
}

export interface UpdateSavedLocationInput {
  name?: string;
  city?: string;
  notes?: string;
  alertThresholdScore?: number;
  isHome?: boolean;
}

export function listSavedLocations(): Promise<SavedLocation[]> {
  return apiFetch<SavedLocation[]>('/api/saved-locations');
}

export function createSavedLocation(input: CreateSavedLocationInput): Promise<SavedLocation> {
  return apiFetch<SavedLocation>('/api/saved-locations', { method: 'POST', body: JSON.stringify(input) });
}

export function updateSavedLocation(id: string, input: UpdateSavedLocationInput): Promise<SavedLocation> {
  return apiFetch<SavedLocation>(`/api/saved-locations/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export async function deleteSavedLocation(id: string): Promise<void> {
  await apiFetch<void>(`/api/saved-locations/${id}`, { method: 'DELETE' });
}

export interface AppConfig {
  recentFindsLimit: number;
  recentBeachesLimit: number;
}

export function getAppConfig(): Promise<AppConfig> {
  return apiFetch<AppConfig>('/api/config');
}

export interface Profile {
  email: string;
  displayName: string | null;
  shellingSinceYear: number;
  avatarUrl: string | null;
}

export interface UpdateProfileInput {
  displayName?: string;
  shellingSinceYear?: number;
  avatarKey?: string;
}

export function getProfile(): Promise<Profile> {
  return apiFetch<Profile>('/api/profile');
}

export function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  return apiFetch<Profile>('/api/profile', { method: 'PATCH', body: JSON.stringify(input) });
}

export async function registerPushToken(token: string): Promise<void> {
  await apiFetch<void>('/api/push-token', { method: 'PUT', body: JSON.stringify({ token }) });
}

export async function unregisterPushToken(): Promise<void> {
  await apiFetch<void>('/api/push-token', { method: 'DELETE' });
}

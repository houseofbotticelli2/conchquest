import { supabase } from './supabase';

// Our own domain, deliberately, rather than Railway's generated
// `conchquest-api-dev.up.railway.app` (both point at the same service). This
// string is compiled into the binary: if the host it names ever stops
// resolving, every installed build is dead until testers update from
// TestFlight, and there is nothing we can do server-side. A domain we own can
// simply be repointed. Swap to http://localhost:3000 for local backend testing.
const API_BASE_URL = 'https://api.conchquest.app';

export class ApiError extends Error {}

// Screens render error.message straight to the user, so anything thrown here
// is product copy. Without this, a dropped connection showed testers
// "fetch failed: UnexpectedException: The network connection was lost.
// (at ExpoModulesCore/Promise.swift:56)" -- a Swift file and line number, on
// the Shellcast screen.
const NETWORK_MESSAGE = "Couldn't reach Conchquest. Check your connection and try again.";

const REQUEST_TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 800;
// Photo uploads are several MB over whatever signal a beach has; they need
// far longer than a read before we call them dead.
const UPLOAD_TIMEOUT_MS = 90_000;

/**
 * Transport-level failure, as opposed to the server answering with an error.
 * fetch() rejects with TypeError when the connection itself fails -- which is
 * how iOS surfaces NSURLErrorNetworkConnectionLost (-1005), the "connection
 * died mid-request" you get on a Wi-Fi/cellular handoff or after the app has
 * been backgrounded. Our own timeout arrives as AbortError.
 */
function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && err.name === 'AbortError');
}

// Without a timeout a dead socket can hang until iOS gives up, which reads as
// a frozen screen rather than a failure the user can act on.
async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError('Not logged in');

  const url = `${API_BASE_URL}${path}`;
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  };

  // Only retry reads. A dropped connection gives no clue whether the server
  // processed the request before the socket died, so replaying a POST could
  // log the same find twice -- worse than the error we're papering over.
  const isRead = (options.method ?? 'GET').toUpperCase() === 'GET';

  let res: Response;
  try {
    res = await fetchWithTimeout(url, requestOptions);
  } catch (err) {
    if (!isNetworkError(err) || !isRead) throw new ApiError(NETWORK_MESSAGE);
    // These failures are transient by nature; one retry usually lands.
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    try {
      res = await fetchWithTimeout(url, requestOptions);
    } catch {
      throw new ApiError(NETWORK_MESSAGE);
    }
  }

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
  weather: { tempF: number | null; conditions: string | null; sunrise: string; sunset: string; humidity: number | null; uvIndex: number | null };
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
  bestWindow: { start: string; end: string; lowTideTime: string; reason: string; isDaylight: boolean } | null;
  // Whether this result respected the daylight restriction -- tells the UI
  // how to interpret a null bestWindow (no low tide at all vs. one that only
  // falls at night) without a separate profile fetch.
  restrictShellingToDaylight: boolean;
  explanation: string;
  factors: ScoreFactor[];
  conditions: NormalizedConditions;
}

export function getScore(lat: number, lon: number): Promise<ShellingScoreResult> {
  return apiFetch<ShellingScoreResult>(`/api/score?lat=${lat}&lon=${lon}`);
}

export interface MultiDayScoreEntry extends ShellingScoreResult {
  date: string; // YYYY-MM-DD
  // The day's *other* low tide on a two-low day, if any -- display only,
  // never the one bestWindow/scoring is anchored to. Optional since a
  // still-fresh cached response written before this field existed won't
  // have it.
  altLowTide?: { time: string; heightFt: number } | null;
}

export async function getMultiDayScore(lat: number, lon: number): Promise<MultiDayScoreEntry[]> {
  const { days } = await apiFetch<{ days: MultiDayScoreEntry[] }>(`/api/score/multi-day?lat=${lat}&lon=${lon}`);
  return days;
}

export interface HourlyBlock {
  time: string;
  tempF: number;
  conditions: string | null;
  precipChance: number | null;
  humidity: number | null;
}

export async function getHourlyTrend(lat: number, lon: number, dayOffset: number): Promise<HourlyBlock[]> {
  const { blocks } = await apiFetch<{ blocks: HourlyBlock[] }>(
    `/api/score/hourly?lat=${lat}&lon=${lon}&dayOffset=${dayOffset}`
  );
  return blocks;
}

// Server-side reverse geocoding, used only on web (expo-location's reverse
// geocoding is native-hardware-only; its web shim throws unconditionally).
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const { city } = await apiFetch<{ city: string | null }>(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
  return city;
}

export interface StrategyResult {
  strategy: string;
  source: 'ai' | 'fallback';
}

export function getStrategy(
  result: ShellingScoreResult,
  beachLabel: string,
  dayLabel: string,
  bestWindowStart: string | null,
  bestWindowEnd: string | null,
  dayOffset: number,
  bestWindowAlreadyPassed: boolean
): Promise<StrategyResult> {
  return apiFetch<StrategyResult>('/api/score/strategy', {
    method: 'POST',
    body: JSON.stringify({ result, beachLabel, dayLabel, bestWindowStart, bestWindowEnd, dayOffset, bestWindowAlreadyPassed }),
  });
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
  // Small variant for rows and the expanded card. The API falls back to the
  // original when a find has no thumbnail yet, so this is never null when
  // photoUrl isn't -- but keep the original for PhotoViewer's zoom.
  thumbUrl: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityFind {
  isOwner: false;
  id: string;
  loggedByUserId: string;
  speciesId: string | null;
  speciesName: string | null;
  speciesRarity: BadgeRarity | null;
  loggedBy: string;
  location: { lat: number; lon: number };
  foundAt: string;
  condition: FindCondition | null;
  notes: string | null;
  photoUrl: string | null;
  // Small variant for rows and the expanded card. The API falls back to the
  // original when a find has no thumbnail yet, so this is never null when
  // photoUrl isn't -- but keep the original for PhotoViewer's zoom.
  thumbUrl: string | null;
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

  // This goes straight to the bucket's presigned URL, so it doesn't pass
  // through apiFetch and needs its own handling. Photos run to several MB and
  // people log finds standing on a beach, so the 15s read timeout would cut
  // off perfectly healthy uploads -- hence a much longer one here.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: photoBlob,
      signal: controller.signal,
    });
  } catch (err) {
    // Safe to leave to the caller's retry: the presigned URL targets one fixed
    // key, so re-uploading overwrites rather than duplicating.
    throw new ApiError(isNetworkError(err) ? NETWORK_MESSAGE : 'Photo upload failed. Please try again.');
  } finally {
    clearTimeout(timer);
  }

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
  loggedByUserId: string;
  speciesId: string | null;
  speciesName: string | null;
  speciesRarity: BadgeRarity | null;
  loggedBy: string;
  location: { lat: number; lon: number };
  foundAt: string;
  condition: FindCondition | null;
  notes: string | null;
  photoUrl: string | null;
  // Small variant for rows and the expanded card. The API falls back to the
  // original when a find has no thumbnail yet, so this is never null when
  // photoUrl isn't -- but keep the original for PhotoViewer's zoom.
  thumbUrl: string | null;
  distanceFeet: number;
}

export interface FindCluster {
  lat: number;
  lon: number;
  count: number;
}

export type NearbyFindsResult =
  | { mode: 'individual'; finds: NearbyFind[] }
  | { mode: 'clusters'; clusters: FindCluster[] };

export function listNearbyFinds(lat: number, lon: number, radiusFeet = 16_000): Promise<NearbyFindsResult> {
  return apiFetch<NearbyFindsResult>(`/api/finds/nearby?lat=${lat}&lon=${lon}&radiusFeet=${radiusFeet}`);
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
  isFavorite: boolean;
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
  isFavorite?: boolean;
  lat?: number;
  lon?: number;
}

export function listSavedLocations(limit?: number): Promise<SavedLocation[]> {
  const query = limit !== undefined ? `?limit=${limit}` : '';
  return apiFetch<SavedLocation[]>(`/api/saved-locations${query}`);
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
  restrictShellingToDaylight: boolean;
  // Non-null while an account deletion is pending. The app shows a restore
  // banner during the grace period; after that the account is gone for good.
  deletionRequestedAt: string | null;
  deletionScheduledFor: string | null;
}

export interface DeletionStatus {
  deletionRequestedAt: string | null;
  deletionScheduledFor: string | null;
  graceDays?: number;
}

export interface UpdateProfileInput {
  displayName?: string;
  shellingSinceYear?: number;
  avatarKey?: string;
  restrictShellingToDaylight?: boolean;
}

export function getProfile(): Promise<Profile> {
  return apiFetch<Profile>('/api/profile');
}

/**
 * Schedules the account for deletion. Not immediate: finds leave the community
 * right away, and the account is permanently removed after the grace period
 * unless cancelDeleteAccount() is called first.
 */
export function requestDeleteAccount(): Promise<DeletionStatus> {
  return apiFetch<DeletionStatus>('/api/profile/delete', { method: 'POST' });
}

export function cancelDeleteAccount(): Promise<DeletionStatus> {
  return apiFetch<DeletionStatus>('/api/profile/delete/cancel', { method: 'POST' });
}

/** Permanent -- the row and both bucket objects go. Confirm before calling. */
export async function deleteFind(id: string): Promise<void> {
  await apiFetch<void>(`/api/finds/${id}`, { method: 'DELETE' });
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

export type ReportReason = 'inappropriate_content' | 'harassment' | 'spam' | 'other';

export async function reportFind(findId: string, reason: ReportReason, notes?: string): Promise<void> {
  await apiFetch<void>('/api/reports', { method: 'POST', body: JSON.stringify({ findId, reason, notes }) });
}

export interface BlockedUser {
  userId: string;
  displayName: string;
}

export function listBlockedUsers(): Promise<BlockedUser[]> {
  return apiFetch<BlockedUser[]>('/api/blocks');
}

export async function blockUser(userId: string): Promise<void> {
  await apiFetch<void>('/api/blocks', { method: 'POST', body: JSON.stringify({ userId }) });
}

export async function unblockUser(userId: string): Promise<void> {
  await apiFetch<void>(`/api/blocks/${userId}`, { method: 'DELETE' });
}

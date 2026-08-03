import { supabase } from './supabase';

// VITE_API_BASE_URL lets this point at a local `npm run dev` API instead of
// the deployed one -- set it in admin/.env.local (gitignored), no code edit
// needed like the mobile app's hardcoded constant.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://conchquest-api-dev.up.railway.app';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new ApiError('Not signed in', 401);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(body?.error ?? `Request failed with status ${response.status}`, response.status);
  }

  return body as T;
}

export interface AdminMe {
  id: string;
  email: string;
  displayName: string | null;
  role: 'user' | 'admin';
}

export function getMe(): Promise<AdminMe> {
  return apiFetch<AdminMe>('/api/admin/me');
}

export interface DashboardStats {
  memberCount: number;
  findsCount: number;
  beachesCount: number;
}

export function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/api/admin/dashboard-stats');
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  role: 'user' | 'admin';
  createdAt: string;
  findsCount: number;
  beachesCount: number;
}

export function listUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/api/admin/users');
}

export function deleteUser(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/users/${id}`, { method: 'DELETE' });
}

export type Rarity = 'common' | 'uncommon' | 'rare' | 'very_rare';

export interface Species {
  id: string;
  commonName: string;
  scientificName: string;
  family: string | null;
  genus: string | null;
  rarity: Rarity;
  description: string | null;
  habitat: string | null;
  regionalOccurrence: string[];
  seasonality: string | null;
  imageUrl: string | null;
}

export interface SpeciesInput {
  commonName: string;
  scientificName: string;
  family?: string | null;
  genus?: string | null;
  rarity?: Rarity;
  description?: string | null;
  habitat?: string | null;
  seasonality?: string | null;
}

// Reads the existing public species list (any authenticated user can already
// read the catalog) -- only writes go through the admin-only endpoints.
export function listSpecies(): Promise<Species[]> {
  return apiFetch<Species[]>('/api/species');
}

export function createSpecies(input: SpeciesInput): Promise<Species> {
  return apiFetch<Species>('/api/admin/species', { method: 'POST', body: JSON.stringify(input) });
}

export function updateSpecies(id: string, input: Partial<SpeciesInput>): Promise<Species> {
  return apiFetch<Species>(`/api/admin/species/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteSpecies(id: string): Promise<void> {
  return apiFetch<void>(`/api/admin/species/${id}`, { method: 'DELETE' });
}

export interface ConfigEntry {
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

export function listConfig(): Promise<ConfigEntry[]> {
  return apiFetch<ConfigEntry[]>('/api/admin/config');
}

export function updateConfig(key: string, value: unknown): Promise<ConfigEntry> {
  return apiFetch<ConfigEntry>(`/api/admin/config/${key}`, { method: 'PATCH', body: JSON.stringify({ value }) });
}

export type PromptScenario = 'strong' | 'thin' | 'rain' | 'night' | 'nightWindow';

export function testPrompt(systemPrompt: string, scenario: PromptScenario): Promise<{ strategy: string }> {
  return apiFetch<{ strategy: string }>('/api/admin/prompt-test', {
    method: 'POST',
    body: JSON.stringify({ systemPrompt, scenario }),
  });
}

export interface NoaaFailure {
  id: string;
  source: string;
  stationId: string | null;
  errorMessage: string;
  occurredAt: string;
}

export function listNoaaFailures(): Promise<NoaaFailure[]> {
  return apiFetch<NoaaFailure[]>('/api/noaa-failures?limit=1000');
}

export interface CacheCleanupRun {
  id: string;
  ranAt: string;
  conditionsCleared: number;
  strategyCleared: number;
  forecastCleared: number;
}

export function listCacheCleanupRuns(): Promise<CacheCleanupRun[]> {
  return apiFetch<CacheCleanupRun[]>('/api/cache-cleanup-runs');
}

export interface AuditLogEntry {
  id: string;
  adminEmail: string;
  action: string;
  target: string | null;
  createdAt: string;
}

export function listAuditLog(): Promise<AuditLogEntry[]> {
  return apiFetch<AuditLogEntry[]>('/api/admin/audit-log');
}

export interface LeaderboardEntry {
  id: string;
  displayName: string | null;
  email: string;
  findsCount: number;
  rareFindsCount: number;
  speciesCount: number;
  homeBeachName: string | null;
}

export function listLeaderboard(): Promise<LeaderboardEntry[]> {
  return apiFetch<LeaderboardEntry[]>('/api/admin/leaderboard');
}

export interface FailingStation {
  stationId: string;
  source: string;
  errorMessage: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  stationName: string | null;
  lat: number | null;
  lon: number | null;
}

export function listFailingStations(): Promise<FailingStation[]> {
  return apiFetch<FailingStation[]>('/api/admin/failing-stations');
}

export interface MemberDetail {
  profile: {
    id: string;
    email: string;
    displayName: string | null;
    role: 'user' | 'admin';
    shellingSinceYear: number | null;
    createdAt: string;
    lastActiveAt: string;
  };
  stats: {
    findsCount: number;
    rareFindsCount: number;
    speciesCount: number;
    beachesCount: number;
  };
  finds: {
    id: string;
    foundAt: string;
    condition: string | null;
    notes: string | null;
    isPrivate: boolean;
    photoUrl: string | null;
    location: { lat: number; lon: number };
    speciesName: string | null;
    rarity: string | null;
  }[];
  beaches: {
    id: string;
    name: string;
    city: string | null;
    isHome: boolean;
    alertThresholdScore: number | null;
    createdAt: string;
  }[];
}

export function getMemberDetail(id: string): Promise<MemberDetail> {
  return apiFetch<MemberDetail>(`/api/admin/users/${id}`);
}

// VITE_API_BASE_URL lets this point at a local `npm run dev` API instead of
// the deployed one -- set it in admin/.env.local (gitignored), no code edit
// needed like the mobile app's hardcoded constant.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.conchquest.app';

export class ApiError extends Error {
  status: number;
  // Raw parsed error body -- e.g. requireAdmin's 403 echoes the signed-in
  // user's email, which AuthProvider needs for the "not admin" screen since
  // it no longer has its own copy of the session to read it from.
  body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// Auth is an httpOnly cookie set by the API (adminSession.ts) -- there's no
// token for this code to read or attach, `credentials: 'include'` is what
// makes the browser send it. Never add an Authorization header here.
async function rawFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(body?.error ?? `Request failed with status ${response.status}`, response.status, body);
  }

  return body as T;
}

export async function login(email: string, password: string): Promise<void> {
  const response = await rawFetch('/api/admin/session/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  await parseResponse(response);
}

export async function logout(): Promise<void> {
  await rawFetch('/api/admin/session/logout', { method: 'POST' });
}

// One retry after a fresh access-token cookie via the refresh cookie -- a
// 401 here almost always just means the (short-lived) access token expired
// mid-session, not that the user was ever signed out.
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await rawFetch(path, options);
  if (response.status !== 401) return parseResponse<T>(response);

  const refreshResponse = await rawFetch('/api/admin/session/refresh', { method: 'POST' });
  if (!refreshResponse.ok) return parseResponse<T>(response);

  const retryResponse = await rawFetch(path, options);
  return parseResponse<T>(retryResponse);
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

export type ReportStatus = 'pending' | 'dismissed' | 'find_removed';
export type ReportReason = 'inappropriate_content' | 'harassment' | 'spam' | 'other';

export interface ContentReport {
  id: string;
  reason: ReportReason;
  notes: string | null;
  status: ReportStatus;
  createdAt: string;
  reviewedAt: string | null;
  reporterEmail: string;
  reportedUserId: string;
  reportedEmail: string;
  reportedDisplayName: string | null;
  find: {
    id: string;
    speciesName: string | null;
    notes: string | null;
    photoUrl: string | null;
  } | null;
}

export function listReports(status: ReportStatus = 'pending'): Promise<ContentReport[]> {
  return apiFetch<ContentReport[]>(`/api/admin/reports?status=${status}`);
}

export function reviewReport(id: string, action: 'dismiss' | 'remove_find'): Promise<void> {
  return apiFetch(`/api/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) });
}

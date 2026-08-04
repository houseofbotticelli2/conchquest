import OpenAI from 'openai';
import { pool } from '../config/db';
import { env } from '../config/env';
import { ShellingScoreResult } from '../types';
import { getConfigString, getConfigNumber } from './appConfig';
import { getForecast } from './openWeather';
import { round, feetToMeters } from '../utils/units';

const STRATEGY_TIMEOUT_MS = 5000;
const DEFAULT_STRATEGY_TEMPERATURE = 0.5;
const DEFAULT_STRATEGY_MAX_TOKENS = 200;
const RARE_RARITIES = ['rare', 'very_rare'];
const RARE_FIND_RADIUS_FEET = 16_000; // ~3mi, matches finds/nearby's default radius
const RARE_FIND_LOOKBACK_DAYS = 7;
const MAX_RARE_FINDS_MENTIONED = 3;

const DEFAULT_SYSTEM_PROMPT =
  'You are a seasoned, experienced shell collector giving a quick, practical recommendation to someone checking conditions before heading out to a specific beach. Write 2-4 sentences of natural, conversational advice based on the JSON you are given. Never invent data you were not given. ' +
  'The JSON includes a "dayLabel" field (e.g. "today", "tomorrow", or a weekday like "Thursday") describing which day this forecast is for -- refer to that day using exactly that word if you mention it at all, and never say "tomorrow" unless dayLabel is literally "tomorrow". ' +
  'A null "conditions.uvIndex" means the best window falls outside daylight hours -- never mention UV index, sunscreen, sun protection, or a hat in that case, since none of that applies in the dark.';

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: env.openaiApiKey });
  return client;
}

function bucket(lat: number, lon: number) {
  return { latBucket: round(lat, 2), lonBucket: round(lon, 2) };
}

// Dedicated table, independent of conditions_cache -- see the migration
// comment for why (conditions_cache is only ever populated by the single-day
// GET /api/score route; the Score screen actually uses the multi-day
// forecast, which never writes there, so a strategy cache piggybacked on it
// could never find a row to attach to). Keyed by day offset in addition to
// location, since each day on the multi-day strip needs its own cached text.
async function readStrategyCache(lat: number, lon: number, dayOffset: number): Promise<string | null> {
  const { latBucket, lonBucket } = bucket(lat, lon);
  const result = await pool.query<{ strategy_text: string }>(
    `SELECT strategy_text FROM shelling_strategy_cache
     WHERE lat_bucket = $1 AND lon_bucket = $2 AND day_offset = $3 AND expires_at > now()
     ORDER BY generated_at DESC LIMIT 1`,
    [latBucket, lonBucket, dayOffset]
  );
  return result.rows[0]?.strategy_text ?? null;
}

async function writeStrategyCache(lat: number, lon: number, dayOffset: number, text: string): Promise<void> {
  const { latBucket, lonBucket } = bucket(lat, lon);
  const expiresAt = new Date(Date.now() + env.strategyCacheTtlMinutes * 60_000).toISOString();
  await pool.query(
    `INSERT INTO shelling_strategy_cache (lat_bucket, lon_bucket, day_offset, strategy_text, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [latBucket, lonBucket, dayOffset, text, expiresAt]
  );
}

interface RareFindRow {
  species_name: string | null;
  found_at: Date;
}

async function getRecentRareFinds(lat: number, lon: number): Promise<string[]> {
  const result = await pool.query<RareFindRow>(
    `SELECT ss.common_name AS species_name, sf.found_at
     FROM shell_finds sf
     JOIN shell_species ss ON ss.id = sf.species_id
     WHERE ss.rarity = ANY($1)
       AND sf.found_at > now() - ($2 || ' days')::interval
       AND ST_DWithin(sf.geog, ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography, $5)
     ORDER BY sf.found_at DESC
     LIMIT $6`,
    [RARE_RARITIES, RARE_FIND_LOOKBACK_DAYS, lon, lat, feetToMeters(RARE_FIND_RADIUS_FEET), MAX_RARE_FINDS_MENTIONED]
  );

  return result.rows
    .filter((row): row is RareFindRow & { species_name: string } => row.species_name !== null)
    .map((row) => {
      const daysAgo = Math.max(0, Math.floor((Date.now() - row.found_at.getTime()) / 86_400_000));
      const when = daysAgo === 0 ? 'today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
      return `${row.species_name} (spotted ${when})`;
    });
}

// The current-weather snapshot has no precipitation-chance field -- only the
// 3-hour forecast blocks do -- so this pulls the nearest upcoming block's pop.
async function getPrecipChancePercent(lat: number, lon: number): Promise<number | null> {
  try {
    const blocks = await getForecast(lat, lon);
    const now = Date.now();
    const next = blocks.find((b) => new Date(b.time).getTime() >= now) ?? blocks[0];
    return next && typeof next.pop === 'number' ? Math.round(next.pop * 100) : null;
  } catch (err) {
    console.error('Failed to fetch precipitation chance for strategy prompt:', err instanceof Error ? err.message : err);
    return null;
  }
}

// bestWindow.isDaylight already carries this (scoringEngine.ts) -- kept as a
// tiny wrapper so the prompt-building code below reads naturally.
// Note: rendering a *human-readable* local time is NOT safe to do from a raw
// ISO string without knowing the beach's local timezone, which this server
// doesn't have -- bestWindowStart/End must come pre-formatted from the
// mobile client instead of being derived here. Passing the model raw UTC ISO
// strings and asking it to render them as local time was the bug that caused
// it to state the window ~4 hours off and wrongly recommend a flashlight for
// a window that actually ended right at sunset.
function isBestWindowOutsideDaylight(result: ShellingScoreResult): boolean {
  return result.bestWindow ? !result.bestWindow.isDaylight : false;
}

function buildUserPayload(
  result: ShellingScoreResult,
  beachLabel: string,
  dayLabel: string,
  bestWindowStart: string | null,
  bestWindowEnd: string | null,
  precipChancePercent: number | null,
  recentRareFinds: string[]
) {
  return {
    beach: beachLabel,
    dayLabel,
    confidence: result.confidence,
    bestWindowStart,
    bestWindowEnd,
    bestWindowOutsideDaylight: isBestWindowOutsideDaylight(result),
    // Disambiguates a null bestWindowStart/End: with this true, null means
    // "the low tide happens at night and this user restricts to daylight" --
    // with this false, null means "no strong low tide today at all." Without
    // it the model can't tell those apart and might say timing doesn't
    // matter on a day that actually has a real (just nighttime) low.
    restrictShellingToDaylight: result.restrictShellingToDaylight,
    factors: result.factors.map((f) => ({ label: f.label, explanation: f.explanation })),
    conditions: {
      windMph: result.conditions.wind.speedMph,
      waveHeightFt: result.conditions.waves.heightFt,
      weatherSummary: result.conditions.weather.conditions,
      // uvIndex is always today's live reading, not the best window's -- a
      // nighttime window (e.g. 12:45-3:45 AM) would otherwise still carry
      // whatever UV value happened at fetch time, prompting nonsensical
      // "wear sunscreen" advice for a window that's actually in the dark.
      uvIndex: isBestWindowOutsideDaylight(result) ? null : result.conditions.weather.uvIndex,
      precipChancePercent,
    },
    recentRareFinds,
  };
}

async function callOpenAI(systemPrompt: string, userPayload: unknown): Promise<string> {
  const [temperature, maxTokens] = await Promise.all([
    getConfigNumber('shelling_strategy_temperature', DEFAULT_STRATEGY_TEMPERATURE),
    getConfigNumber('shelling_strategy_max_tokens', DEFAULT_STRATEGY_MAX_TOKENS),
  ]);

  const response = await getClient().chat.completions.create(
    {
      model: 'gpt-4o-mini',
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPayload) },
      ],
    },
    { timeout: STRATEGY_TIMEOUT_MS }
  );

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenAI returned an empty strategy response');
  return text;
}

export interface StrategyResult {
  strategy: string;
  source: 'ai' | 'fallback';
}

// Canned sample payloads matching buildUserPayload's shape exactly -- lets
// the admin console test a candidate system prompt against realistic
// conditions without needing a real beach/day and without touching the
// strategy cache (a "test" should always hit OpenAI fresh, never a cached
// answer from a previous prompt version).
const TEST_SCENARIOS: Record<string, ReturnType<typeof buildUserPayload>> = {
  strong: {
    beach: 'Sanibel Lighthouse Beach',
    dayLabel: 'Thursday',
    confidence: 'high',
    bestWindowStart: '2:10 PM',
    bestWindowEnd: '4:35 PM',
    bestWindowOutsideDaylight: false,
    restrictShellingToDaylight: false,
    factors: [
      { label: 'Tide', explanation: 'Low tide falls midday with a strong outgoing pull' },
      { label: 'Wind', explanation: 'Light and steady, easy walking conditions' },
    ],
    conditions: { windMph: 6, waveHeightFt: 1.2, weatherSummary: 'clear sky', uvIndex: 7, precipChancePercent: 5 },
    recentRareFinds: ['Junonia (spotted 3 days ago)'],
  },
  thin: {
    beach: 'Blind Pass',
    dayLabel: 'today',
    confidence: 'low',
    bestWindowStart: null,
    bestWindowEnd: null,
    bestWindowOutsideDaylight: false,
    restrictShellingToDaylight: false,
    factors: [{ label: 'Wave data', explanation: 'Nearest buoy reading is stale' }],
    conditions: { windMph: 11, waveHeightFt: null, weatherSummary: 'partly cloudy', uvIndex: 9, precipChancePercent: 15 },
    recentRareFinds: [],
  },
  rain: {
    beach: "Bowman's Beach",
    dayLabel: 'tomorrow',
    confidence: 'medium',
    bestWindowStart: '10:15 AM',
    bestWindowEnd: '12:40 PM',
    bestWindowOutsideDaylight: false,
    restrictShellingToDaylight: false,
    factors: [{ label: 'Precipitation', explanation: 'Rain showers likely through midday' }],
    conditions: { windMph: 9, waveHeightFt: 1.8, weatherSummary: 'rain showers', uvIndex: 4, precipChancePercent: 65 },
    recentRareFinds: ['Scotch Bonnet (spotted 2 days ago)'],
  },
  // Tests the newly-disambiguated null-window case: a real low tide exists,
  // it's just at night and this user restricts to daylight -- bestWindow is
  // null for a different reason than "thin" above (no low tide at all).
  night: {
    beach: 'Turner Beach',
    dayLabel: 'today',
    confidence: 'high',
    bestWindowStart: null,
    bestWindowEnd: null,
    bestWindowOutsideDaylight: false,
    restrictShellingToDaylight: true,
    factors: [{ label: 'Tide', explanation: "Today's low falls well after sunset" }],
    conditions: { windMph: 7, waveHeightFt: 0.9, weatherSummary: 'clear', uvIndex: 8, precipChancePercent: 5 },
    recentRareFinds: [],
  },
  // Tests the flashlight branch on an actual (non-null) window -- only
  // reachable when the user allows night windows at all.
  nightWindow: {
    beach: 'Turner Beach',
    dayLabel: 'today',
    confidence: 'high',
    bestWindowStart: '9:40 PM',
    bestWindowEnd: '12:10 AM',
    bestWindowOutsideDaylight: true,
    restrictShellingToDaylight: false,
    factors: [{ label: 'Tide', explanation: "Today's low falls well after sunset" }],
    conditions: { windMph: 7, waveHeightFt: 0.9, weatherSummary: 'clear', uvIndex: null, precipChancePercent: 5 },
    recentRareFinds: [],
  },
};

export type TestScenario = keyof typeof TEST_SCENARIOS;
export const TEST_SCENARIO_KEYS = Object.keys(TEST_SCENARIOS) as TestScenario[];

// Deliberately bypasses both the cache and the fallback-to-explanation
// behavior of getShellingStrategy -- this is meant to show the admin exactly
// what OpenAI returns (or exactly how it fails) for a candidate prompt,
// not a cached answer from a previous version or a masked failure.
export async function testStrategyPrompt(systemPrompt: string, scenario: TestScenario): Promise<string> {
  const userPayload = TEST_SCENARIOS[scenario];
  if (!userPayload) throw new Error(`Unknown scenario: ${scenario}`);
  return callOpenAI(systemPrompt, userPayload);
}

export async function getShellingStrategy(
  result: ShellingScoreResult,
  beachLabel: string,
  dayLabel: string,
  bestWindowStart: string | null,
  bestWindowEnd: string | null,
  dayOffset: number
): Promise<StrategyResult> {
  const { lat, lon } = result.conditions.location;

  const cached = await readStrategyCache(lat, lon, dayOffset);
  if (cached) {
    return { strategy: cached, source: 'ai' };
  }

  try {
    const [systemPrompt, precipChancePercent, recentRareFinds] = await Promise.all([
      getConfigString('shelling_strategy_system_prompt', DEFAULT_SYSTEM_PROMPT),
      getPrecipChancePercent(lat, lon),
      getRecentRareFinds(lat, lon),
    ]);

    const userPayload = buildUserPayload(
      result,
      beachLabel,
      dayLabel,
      bestWindowStart,
      bestWindowEnd,
      precipChancePercent,
      recentRareFinds
    );
    const strategy = await callOpenAI(systemPrompt, userPayload);

    await writeStrategyCache(lat, lon, dayOffset, strategy);

    return { strategy, source: 'ai' };
  } catch (err) {
    console.error('Shelling strategy generation failed, falling back to factor explanation:', err instanceof Error ? err.message : err);
    return { strategy: result.explanation, source: 'fallback' };
  }
}

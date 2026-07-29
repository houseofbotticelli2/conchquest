import OpenAI from 'openai';
import { pool } from '../config/db';
import { env } from '../config/env';
import { ShellingScoreResult } from '../types';
import { getConfigString } from './appConfig';
import { getForecast } from './openWeather';
import { round, feetToMeters } from '../utils/units';

const STRATEGY_TIMEOUT_MS = 5000;
const STRATEGY_TEMPERATURE = 0.5;
const STRATEGY_MAX_TOKENS = 200;
const RARE_RARITIES = ['rare', 'very_rare'];
const RARE_FIND_RADIUS_FEET = 16_000; // ~3mi, matches finds/nearby's default radius
const RARE_FIND_LOOKBACK_DAYS = 7;
const MAX_RARE_FINDS_MENTIONED = 3;

const DEFAULT_SYSTEM_PROMPT =
  'You are a seasoned, experienced shell collector giving a quick, practical recommendation to someone checking conditions before heading out to a specific beach. Write 2-4 sentences of natural, conversational advice based on the JSON you are given. Never invent data you were not given.';

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: env.openaiApiKey });
  return client;
}

function bucket(lat: number, lon: number) {
  return { latBucket: round(lat, 2), lonBucket: round(lon, 2) };
}

interface StrategyCacheRow {
  id: string;
  strategy_text: string | null;
}

async function readStrategyCacheRow(lat: number, lon: number): Promise<StrategyCacheRow | null> {
  const { latBucket, lonBucket } = bucket(lat, lon);
  const result = await pool.query<StrategyCacheRow>(
    `SELECT id, strategy_text FROM conditions_cache
     WHERE lat_bucket = $1 AND lon_bucket = $2 AND expires_at > now()
     ORDER BY fetched_at DESC LIMIT 1`,
    [latBucket, lonBucket]
  );
  return result.rows[0] ?? null;
}

async function writeStrategyText(id: string, text: string): Promise<void> {
  await pool.query(`UPDATE conditions_cache SET strategy_text = $1, strategy_generated_at = now() WHERE id = $2`, [
    text,
    id,
  ]);
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

// Whether the window falls outside daylight is computed here from raw ISO
// instants, which is timezone-safe (comparing two absolute timestamps).
// Rendering a *human-readable* local time, by contrast, is NOT safe to do
// from a raw ISO string without knowing the beach's local timezone -- which
// this server doesn't have -- so bestWindowStart/End must come pre-formatted
// from the mobile client instead of being derived here. Passing the model
// raw UTC ISO strings and asking it to render them as local time was the bug
// that caused it to state the window ~4 hours off and wrongly recommend a
// flashlight for a window that actually ended right at sunset.
function isBestWindowOutsideDaylight(result: ShellingScoreResult): boolean {
  if (!result.bestWindow) return false;
  const start = new Date(result.bestWindow.start).getTime();
  const end = new Date(result.bestWindow.end).getTime();
  const sunrise = new Date(result.conditions.weather.sunrise).getTime();
  const sunset = new Date(result.conditions.weather.sunset).getTime();
  return start < sunrise || end > sunset;
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
    factors: result.factors.map((f) => ({ label: f.label, explanation: f.explanation })),
    conditions: {
      windMph: result.conditions.wind.speedMph,
      waveHeightFt: result.conditions.waves.heightFt,
      weatherSummary: result.conditions.weather.conditions,
      uvIndex: result.conditions.weather.uvIndex,
      precipChancePercent,
    },
    recentRareFinds,
  };
}

async function callOpenAI(systemPrompt: string, userPayload: unknown): Promise<string> {
  const response = await getClient().chat.completions.create(
    {
      model: 'gpt-4o-mini',
      temperature: STRATEGY_TEMPERATURE,
      max_tokens: STRATEGY_MAX_TOKENS,
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

export async function getShellingStrategy(
  result: ShellingScoreResult,
  beachLabel: string,
  dayLabel: string,
  bestWindowStart: string | null,
  bestWindowEnd: string | null
): Promise<StrategyResult> {
  const { lat, lon } = result.conditions.location;

  const cacheRow = await readStrategyCacheRow(lat, lon);
  if (cacheRow?.strategy_text) {
    return { strategy: cacheRow.strategy_text, source: 'ai' };
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

    if (cacheRow) {
      await writeStrategyText(cacheRow.id, strategy);
    }

    return { strategy, source: 'ai' };
  } catch (err) {
    console.error('Shelling strategy generation failed, falling back to factor explanation:', err instanceof Error ? err.message : err);
    return { strategy: result.explanation, source: 'fallback' };
  }
}

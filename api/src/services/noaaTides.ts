import { TideConditions, TideEvent } from '../types';
import { findNearestTideStation } from './noaaStations';
import { logNoaaFailure } from './noaaFailureLog';

interface RawPrediction {
  t: string; // "2024-01-15 06:12"
  v: string;
  type: 'H' | 'L';
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPredictionsOnce(stationId: string, begin: Date, end: Date): Promise<RawPrediction[]> {
  const url = new URL('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter');
  url.searchParams.set('station', stationId);
  url.searchParams.set('product', 'predictions');
  url.searchParams.set('datum', 'MLLW');
  url.searchParams.set('time_zone', 'gmt');
  url.searchParams.set('units', 'english');
  url.searchParams.set('interval', 'hilo');
  url.searchParams.set('format', 'json');
  url.searchParams.set('begin_date', formatDate(begin));
  url.searchParams.set('end_date', formatDate(end));
  url.searchParams.set('application', 'Conchquest');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`NOAA tide predictions request failed: ${response.status}`);
  }
  const body = (await response.json()) as { predictions?: RawPrediction[]; error?: { message: string } };
  if (body.error) {
    throw new Error(`NOAA tide predictions error: ${body.error.message}`);
  }
  return body.predictions ?? [];
}

// NOAA CO-OPS intermittently returns "No Predictions data was found" or times
// out for stations that reliably have data moments later — a documented,
// NOAA-side flakiness (confirmed against official docs, not a request-format
// bug on our end). A short retry with backoff clears most of these transient
// failures without meaningfully slowing down the request.
async function fetchPredictions(stationId: string, begin: Date, end: Date): Promise<RawPrediction[]> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchPredictionsOnce(stationId, begin, end);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw lastError;
}

function toEvent(p: RawPrediction): TideEvent {
  return {
    type: p.type === 'H' ? 'high' : 'low',
    time: new Date(`${p.t.replace(' ', 'T')}Z`).toISOString(),
    heightFt: Number(p.v),
  };
}

interface TideStationInfo {
  stationId: string;
  name: string;
  distanceFeet: number;
}

// Pure -- computes tide state (level/movement/upcoming events) at an
// arbitrary instant from an already-fetched event list. Shared by the live
// "now" path (getTideConditions) and the multi-day forecast, which evaluates
// this at a representative time for each future day rather than the real
// current time.
export function deriveTideConditions(station: TideStationInfo, events: TideEvent[], at: Date): TideConditions {
  const atMs = at.getTime();
  let prev: TideEvent | null = null;
  let next: TideEvent | null = null;
  for (const event of events) {
    const eventMs = new Date(event.time).getTime();
    if (eventMs <= atMs) prev = event;
    if (eventMs > atMs && !next) next = event;
  }

  let currentLevelFt: number | null = null;
  let percentToNextExtreme: number | null = null;
  let movement: TideConditions['movement'] = 'unknown';

  if (prev && next) {
    const prevMs = new Date(prev.time).getTime();
    const nextMs = new Date(next.time).getTime();
    const fraction = (atMs - prevMs) / (nextMs - prevMs);
    // Tide rise/fall approximates a cosine curve between consecutive
    // high/low extremes far better than a linear interpolation.
    currentLevelFt = prev.heightFt + (next.heightFt - prev.heightFt) * (1 - Math.cos(Math.PI * fraction)) / 2;
    percentToNextExtreme = fraction * 100;

    const minutesFromTurn = Math.min(atMs - prevMs, nextMs - atMs) / 60_000;
    if (minutesFromTurn < 15) {
      movement = 'slack';
    } else {
      movement = next.heightFt > prev.heightFt ? 'rising' : 'falling';
    }
  }

  const upcomingEvents = events.filter((e) => new Date(e.time).getTime() > atMs).slice(0, 4);

  return {
    stationId: station.stationId,
    stationName: station.name,
    distanceFeet: station.distanceFeet,
    currentLevelFt,
    percentToNextExtreme,
    movement,
    nextEvents: upcomingEvents,
  };
}

export async function getTideEventsForRange(
  lat: number,
  lon: number,
  begin: Date,
  end: Date
): Promise<{ station: TideStationInfo; events: TideEvent[] } | null> {
  const station = await findNearestTideStation(lat, lon);
  if (!station) return null;

  let predictions: RawPrediction[];
  try {
    predictions = await fetchPredictions(station.stationId, begin, end);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`NOAA tide predictions unavailable for station ${station.stationId}:`, err instanceof Error ? err.message : err);
    await logNoaaFailure('tide', station.stationId, err);
    return null;
  }
  const events = predictions.map(toEvent).sort((a, b) => a.time.localeCompare(b.time));
  return { station, events };
}

export async function getTideConditions(lat: number, lon: number, now: Date): Promise<TideConditions | null> {
  const begin = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const result = await getTideEventsForRange(lat, lon, begin, end);
  if (!result) return null;

  return deriveTideConditions(result.station, result.events, now);
}

// The instant to score/derive conditions at: the next upcoming low tide,
// regardless of any daylight restriction (that's a display-only concern for
// findBestWindow, not a scoring one) -- evaluated a minute before it so it
// still appears in deriveTideConditions' nextEvents (which excludes events
// at-or-before the reference instant). Falls back to `at` itself if no low
// tide exists in the given event list (e.g. a data gap).
export function findScoringReferenceTime(events: TideEvent[], at: Date): Date {
  const atMs = at.getTime();
  const nextLow = events.find((e) => e.type === 'low' && new Date(e.time).getTime() > atMs);
  if (!nextLow) return at;
  return new Date(new Date(nextLow.time).getTime() - 60_000);
}

import { TideConditions, TideEvent } from '../types';
import { findNearestTideStation } from './noaaStations';

interface RawPrediction {
  t: string; // "2024-01-15 06:12"
  v: string;
  type: 'H' | 'L';
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

async function fetchPredictions(stationId: string, begin: Date, end: Date): Promise<RawPrediction[]> {
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

function toEvent(p: RawPrediction): TideEvent {
  return {
    type: p.type === 'H' ? 'high' : 'low',
    time: new Date(`${p.t.replace(' ', 'T')}Z`).toISOString(),
    heightFt: Number(p.v),
  };
}

export async function getTideConditions(lat: number, lon: number, now: Date): Promise<TideConditions | null> {
  const station = await findNearestTideStation(lat, lon);
  if (!station) return null;

  const begin = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const predictions = await fetchPredictions(station.stationId, begin, end);
  const events = predictions.map(toEvent).sort((a, b) => a.time.localeCompare(b.time));

  const nowMs = now.getTime();
  let prev: TideEvent | null = null;
  let next: TideEvent | null = null;
  for (const event of events) {
    const eventMs = new Date(event.time).getTime();
    if (eventMs <= nowMs) prev = event;
    if (eventMs > nowMs && !next) next = event;
  }

  let currentLevelFt: number | null = null;
  let percentToNextExtreme: number | null = null;
  let movement: TideConditions['movement'] = 'unknown';

  if (prev && next) {
    const prevMs = new Date(prev.time).getTime();
    const nextMs = new Date(next.time).getTime();
    const fraction = (nowMs - prevMs) / (nextMs - prevMs);
    // Tide rise/fall approximates a cosine curve between consecutive
    // high/low extremes far better than a linear interpolation.
    currentLevelFt = prev.heightFt + (next.heightFt - prev.heightFt) * (1 - Math.cos(Math.PI * fraction)) / 2;
    percentToNextExtreme = fraction * 100;

    const minutesFromTurn = Math.min(nowMs - prevMs, nextMs - nowMs) / 60_000;
    if (minutesFromTurn < 15) {
      movement = 'slack';
    } else {
      movement = next.heightFt > prev.heightFt ? 'rising' : 'falling';
    }
  }

  const upcomingEvents = events.filter((e) => new Date(e.time).getTime() > nowMs).slice(0, 4);

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

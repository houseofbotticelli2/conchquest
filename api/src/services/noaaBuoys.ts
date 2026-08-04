import { WaveConditions } from '../types';
import { findNearestBuoyStation } from './noaaStations';
import { metersToFeet } from '../utils/units';
import { logNoaaFailure } from './noaaFailureLog';
import { getOpenMeteoWaves } from './openMeteoMarine';

// NDBC realtime2 fixed-column layout (most recent observation on the first
// data row): YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
const COLUMNS = ['YY', 'MM', 'DD', 'hh', 'mm', 'WDIR', 'WSPD', 'GST', 'WVHT', 'DPD', 'APD', 'MWD', 'PRES', 'ATMP', 'WTMP', 'DEWP', 'VIS', 'PTDY', 'TIDE'];

function parseValue(raw: string | undefined): number | null {
  if (!raw || raw === 'MM') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchLatestObservation(stationId: string): Promise<Record<string, number | null>> {
  const response = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`);
  if (!response.ok) {
    throw new Error(`NDBC realtime2 request failed: ${response.status}`);
  }
  const text = await response.text();
  const dataLine = text.split('\n').find((line) => line.trim() && !line.startsWith('#'));
  if (!dataLine) {
    throw new Error('NDBC realtime2 response had no data line');
  }

  const fields = dataLine.trim().split(/\s+/);
  const record: Record<string, number | null> = {};
  COLUMNS.forEach((col, i) => {
    record[col] = parseValue(fields[i]);
  });
  return record;
}

// Beyond this range a buoy's readings no longer represent local surf, even
// though it's the "nearest" one on record. (~150km / ~93mi)
const MAX_USEFUL_BUOY_DISTANCE_FEET = 492_000;

// Falls back to Open-Meteo's modeled marine data (see openMeteoMarine.ts)
// when there's no real, working, close-enough buoy reading -- better than
// showing "N/A" outright, since a modeled estimate for the exact location
// beats no data at all. Swallows its own errors (e.g. Open-Meteo itself
// being down) since this is already the fallback path.
async function fallbackToOpenMeteo(lat: number, lon: number, stationId: string | null, distanceFeet: number | null): Promise<WaveConditions> {
  try {
    const modeled = await getOpenMeteoWaves(lat, lon);
    if (modeled) {
      return {
        heightFt: modeled.heightFt,
        periodSec: modeled.periodSec,
        directionDeg: modeled.directionDeg,
        stationId,
        distanceFeet,
        observedAt: new Date().toISOString(),
        stale: false,
      };
    }
  } catch (err) {
    console.error('Open-Meteo marine fallback also failed:', err instanceof Error ? err.message : err);
  }
  return { heightFt: null, periodSec: null, directionDeg: null, stationId, distanceFeet, observedAt: null, stale: true };
}

export async function getWaveConditions(lat: number, lon: number): Promise<WaveConditions | null> {
  const station = await findNearestBuoyStation(lat, lon);
  if (!station) return fallbackToOpenMeteo(lat, lon, null, null);

  if (station.distanceFeet > MAX_USEFUL_BUOY_DISTANCE_FEET) {
    return fallbackToOpenMeteo(lat, lon, station.stationId, station.distanceFeet);
  }

  let observation: Record<string, number | null>;
  try {
    observation = await fetchLatestObservation(station.stationId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`NDBC observation unavailable for station ${station.stationId}:`, err instanceof Error ? err.message : err);
    await logNoaaFailure('buoy', station.stationId, err);
    return fallbackToOpenMeteo(lat, lon, station.stationId, station.distanceFeet);
  }

  const now = new Date();
  // NDBC's YY column has held a 4-digit year since the format update; guard
  // the older 2-digit form too in case a station still reports it.
  const rawYear = observation.YY;
  const year = rawYear !== null ? (rawYear < 100 ? 2000 + rawYear : rawYear) : null;
  const observedAt = year !== null
    ? new Date(Date.UTC(year, (observation.MM as number) - 1, observation.DD as number, observation.hh as number, observation.mm as number))
    : null;
  const ageMinutes = observedAt ? (now.getTime() - observedAt.getTime()) / 60_000 : Infinity;
  const heightFt = observation.WVHT !== null ? metersToFeet(observation.WVHT) : null;

  // Also fall back when the station responded but didn't actually report
  // wave height (some stations report wind only), or its latest reading is
  // more than 2 hours old -- a fresh modeled estimate beats a stale or
  // missing real one.
  if (heightFt === null || ageMinutes > 120) {
    return fallbackToOpenMeteo(lat, lon, station.stationId, station.distanceFeet);
  }

  return {
    heightFt,
    periodSec: observation.DPD,
    directionDeg: observation.MWD,
    stationId: station.stationId,
    distanceFeet: station.distanceFeet,
    observedAt: observedAt ? observedAt.toISOString() : null,
    stale: false,
  };
}

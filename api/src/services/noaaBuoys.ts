import { WaveConditions } from '../types';
import { findNearestBuoyStation } from './noaaStations';
import { metersToFeet } from '../utils/units';

// NDBC realtime2 fixed-column layout (most recent observation on the first
// data row): YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS PTDY TIDE
const COLUMNS = ['YY', 'MM', 'DD', 'hh', 'mm', 'WDIR', 'WSPD', 'GST', 'WVHT', 'DPD', 'APD', 'MWD', 'PRES', 'ATMP', 'WTMP', 'DEWP', 'VIS', 'PTDY', 'TIDE'];

function parseValue(raw: string | undefined): number | null {
  if (!raw || raw === 'MM') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchLatestObservation(stationId: string): Promise<Record<string, number | null> | null> {
  const response = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`);
  if (!response.ok) return null;
  const text = await response.text();
  const dataLine = text.split('\n').find((line) => line.trim() && !line.startsWith('#'));
  if (!dataLine) return null;

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

export async function getWaveConditions(lat: number, lon: number): Promise<WaveConditions | null> {
  const station = await findNearestBuoyStation(lat, lon);
  if (!station) return null;

  if (station.distanceFeet > MAX_USEFUL_BUOY_DISTANCE_FEET) {
    return {
      heightFt: null,
      periodSec: null,
      directionDeg: null,
      stationId: station.stationId,
      distanceFeet: station.distanceFeet,
      observedAt: null,
      stale: true,
    };
  }

  const observation = await fetchLatestObservation(station.stationId);
  if (!observation) {
    return {
      heightFt: null,
      periodSec: null,
      directionDeg: null,
      stationId: station.stationId,
      distanceFeet: station.distanceFeet,
      observedAt: null,
      stale: true,
    };
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

  return {
    heightFt: observation.WVHT !== null ? metersToFeet(observation.WVHT) : null,
    periodSec: observation.DPD,
    directionDeg: observation.MWD,
    stationId: station.stationId,
    distanceFeet: station.distanceFeet,
    observedAt: observedAt ? observedAt.toISOString() : null,
    stale: ageMinutes > 120,
  };
}

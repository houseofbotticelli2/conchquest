import { metersToFeet } from '../utils/units';

interface OpenMeteoMarineResponse {
  current?: {
    time: string;
    wave_height: number | null;
    wave_period: number | null;
    wave_direction: number | null;
  };
}

export interface OpenMeteoWaveReading {
  heightFt: number | null;
  periodSec: number | null;
  directionDeg: number | null;
}

// Modeled (not measured) global wave data -- free, no API key, full
// coverage anywhere on Earth. Used only as a fallback when the nearest real
// NDBC buoy doesn't exist, is too far away, or its feed is down (NDBC is
// always preferred when it's actually available, since it's a real in-situ
// reading rather than a forecast model's estimate).
export async function getOpenMeteoWaves(lat: number, lon: number): Promise<OpenMeteoWaveReading | null> {
  const url = new URL('https://marine-api.open-meteo.com/v1/marine');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current', 'wave_height,wave_period,wave_direction');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Open-Meteo marine request failed: ${response.status}`);
  }
  const body = (await response.json()) as OpenMeteoMarineResponse;
  if (!body.current) return null;

  return {
    heightFt: body.current.wave_height != null ? metersToFeet(body.current.wave_height) : null,
    periodSec: body.current.wave_period,
    directionDeg: body.current.wave_direction,
  };
}

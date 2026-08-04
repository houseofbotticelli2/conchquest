import { metersToFeet } from '../utils/units';

interface OpenMeteoMarineHourlyResponse {
  hourly?: {
    time: string[];
    wave_height: (number | null)[];
    wave_period: (number | null)[];
    wave_direction: (number | null)[];
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
//
// Requests the hourly forecast (not just "current") and picks the value
// nearest `at` -- scoring is anchored to a day's low tide, which can be
// hours away from the real current instant, so this lets the fallback track
// that the same way the wind forecast already does, rather than only ever
// answering "what are waves doing right now."
export async function getOpenMeteoWaves(lat: number, lon: number, at: Date): Promise<OpenMeteoWaveReading | null> {
  const url = new URL('https://marine-api.open-meteo.com/v1/marine');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('hourly', 'wave_height,wave_period,wave_direction');
  url.searchParams.set('timezone', 'UTC');
  url.searchParams.set('forecast_days', '6'); // comfortably covers the app's 5-day multi-day forecast

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Open-Meteo marine request failed: ${response.status}`);
  }
  const body = (await response.json()) as OpenMeteoMarineHourlyResponse;
  if (!body.hourly || body.hourly.time.length === 0) return null;

  const atMs = at.getTime();
  let bestIndex = 0;
  let bestDiff = Infinity;
  body.hourly.time.forEach((t, i) => {
    // Open-Meteo's iso8601 hourly timestamps omit both seconds and the "Z"
    // suffix even with timezone=UTC set -- append it so Date parses as UTC
    // rather than the server's local time.
    const diff = Math.abs(new Date(`${t}Z`).getTime() - atMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  });

  const height = body.hourly.wave_height[bestIndex];
  return {
    heightFt: height != null ? metersToFeet(height) : null,
    periodSec: body.hourly.wave_period[bestIndex],
    directionDeg: body.hourly.wave_direction[bestIndex],
  };
}

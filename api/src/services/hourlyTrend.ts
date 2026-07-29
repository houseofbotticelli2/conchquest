import { getForecast } from './openWeather';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface HourlyBlock {
  time: string;
  tempF: number;
  conditions: string | null;
  precipChance: number | null; // 0-1
  humidity: number | null;
}

// dayOffset 0 means "the next 24 hours from right now" rather than a
// calendar-day box -- this app has no per-user timezone info anywhere, so
// there's no reliable notion of "midnight" to box a day by; a rolling
// 24-hour window keeps this simple and still reads naturally for both
// "today" (starting now) and future days (starting dayOffset*24h out).
export async function getHourlyTrend(lat: number, lon: number, dayOffset: number): Promise<HourlyBlock[]> {
  const blocks = await getForecast(lat, lon);
  const now = Date.now();
  const windowStart = now + dayOffset * DAY_MS;
  const windowEnd = windowStart + DAY_MS;

  return blocks
    .filter((b) => {
      const t = new Date(b.time).getTime();
      return t >= windowStart && t < windowEnd;
    })
    .map((b) => ({
      time: b.time,
      tempF: b.tempF,
      conditions: b.conditions,
      precipChance: b.pop,
      humidity: b.humidity,
    }));
}

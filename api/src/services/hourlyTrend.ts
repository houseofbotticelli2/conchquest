import { getCurrentWeather, getForecast } from './openWeather';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface HourlyBlock {
  time: string;
  tempF: number;
  conditions: string | null;
  precipChance: number | null; // 0-1
  humidity: number | null;
}

// This app has no per-user timezone info anywhere, so there's no reliable
// notion of real midnight to box a future day by -- reuse the same
// solar-noon-centered approximation multiDayForecast.ts uses for "this
// calendar day" (dayMidpoint = (sunrise+sunset)/2, +/-12h), shifted by whole
// days from today's real sunrise/sunset, so tomorrow's trend starts near its
// own early morning instead of inheriting whatever hour "now" happens to be.
// Today (dayOffset 0) still starts from right now rather than its own
// midnight, since showing hours that have already passed wouldn't be useful.
export async function getHourlyTrend(lat: number, lon: number, dayOffset: number): Promise<HourlyBlock[]> {
  const [blocks, currentWeather] = await Promise.all([getForecast(lat, lon), getCurrentWeather(lat, lon)]);
  const now = Date.now();

  const baseSunrise = new Date(currentWeather.weather.sunrise);
  let baseSunset = new Date(currentWeather.weather.sunset);
  if (baseSunset.getTime() < baseSunrise.getTime()) baseSunset = new Date(baseSunset.getTime() + DAY_MS);

  const sunrise = baseSunrise.getTime() + dayOffset * DAY_MS;
  const sunset = baseSunset.getTime() + dayOffset * DAY_MS;
  const dayMidpoint = (sunrise + sunset) / 2;
  const dayStart = dayMidpoint - 12 * 60 * 60 * 1000;
  const dayEnd = dayMidpoint + 12 * 60 * 60 * 1000;

  const windowStart = dayOffset === 0 ? Math.max(dayStart, now) : dayStart;
  const windowEnd = dayEnd;

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

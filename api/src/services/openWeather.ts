import { env } from '../config/env';
import { WeatherConditions, WindConditions } from '../types';
import { degToCompass } from '../utils/units';

interface CurrentWeatherResponse {
  wind: { speed: number; deg: number; gust?: number };
  main: { temp: number; humidity: number };
  weather: { main: string; description: string }[];
  sys: { sunrise: number; sunset: number };
}

export interface ForecastBlock {
  time: string;
  windSpeedMph: number;
  windDeg: number;
  tempF: number;
  conditions: string | null;
  humidity: number | null;
  pop: number | null; // probability of precipitation, 0-1
}

interface ForecastResponse {
  list: {
    dt: number;
    wind: { speed: number; deg: number };
    main: { temp: number; humidity: number };
    weather: { description: string }[];
    pop?: number;
  }[];
}

export async function getCurrentWeather(
  lat: number,
  lon: number
): Promise<{ wind: WindConditions; weather: WeatherConditions }> {
  const url = new URL('https://api.openweathermap.org/data/2.5/weather');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('units', 'imperial');
  url.searchParams.set('appid', env.openWeatherApiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`OpenWeather current weather request failed: ${response.status}`);
  }
  const body = (await response.json()) as CurrentWeatherResponse;

  return {
    wind: {
      speedMph: body.wind.speed,
      gustMph: body.wind.gust ?? null,
      directionDeg: body.wind.deg,
      directionCompass: degToCompass(body.wind.deg),
    },
    weather: {
      tempF: body.main.temp,
      conditions: body.weather[0]?.description ?? null,
      sunrise: new Date(body.sys.sunrise * 1000).toISOString(),
      sunset: new Date(body.sys.sunset * 1000).toISOString(),
      humidity: body.main.humidity ?? null,
      uvIndex: null, // filled in separately by getUvIndex -- a different, less reliable endpoint
    },
  };
}

interface UvResponse {
  value: number;
}

// OpenWeather's dedicated UV endpoint is deprecated (no replacement in the
// free-tier weather/forecast APIs this app otherwise uses) -- it could stop
// working without notice, so failures here are swallowed and just mean the
// UV field is omitted rather than the whole conditions fetch failing.
export async function getUvIndex(lat: number, lon: number): Promise<number | null> {
  try {
    const url = new URL('https://api.openweathermap.org/data/2.5/uvi');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('appid', env.openWeatherApiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`OpenWeather UV index request failed: ${response.status}`);
      return null;
    }
    const body = (await response.json()) as UvResponse;
    return typeof body.value === 'number' ? body.value : null;
  } catch (err) {
    console.error('OpenWeather UV index request failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

interface ReverseGeocodeResult {
  name: string;
  state?: string;
  country: string;
}

// Used to fill in a city name for the "No Beach" subtitle on the web
// platform -- expo-location's reverse geocoding is native-hardware-only
// (its web shim throws unconditionally), so web needs a server-side lookup
// instead. Native iOS/Android keep using the free on-device geocoding.
export async function getReverseGeocode(lat: number, lon: number): Promise<string | null> {
  const url = new URL('https://api.openweathermap.org/geo/1.0/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('limit', '1');
  url.searchParams.set('appid', env.openWeatherApiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`OpenWeather reverse geocode request failed: ${response.status}`);
  }
  const body = (await response.json()) as ReverseGeocodeResult[];
  return body[0]?.name ?? null;
}

export async function getForecast(lat: number, lon: number): Promise<ForecastBlock[]> {
  const url = new URL('https://api.openweathermap.org/data/2.5/forecast');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('units', 'imperial');
  url.searchParams.set('appid', env.openWeatherApiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`OpenWeather forecast request failed: ${response.status}`);
  }
  const body = (await response.json()) as ForecastResponse;

  return body.list.map((block) => ({
    time: new Date(block.dt * 1000).toISOString(),
    windSpeedMph: block.wind.speed,
    windDeg: block.wind.deg,
    tempF: block.main.temp,
    conditions: block.weather[0]?.description ?? null,
    humidity: block.main.humidity ?? null,
    pop: typeof block.pop === 'number' ? block.pop : null,
  }));
}

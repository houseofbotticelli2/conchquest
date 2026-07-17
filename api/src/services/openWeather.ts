import { env } from '../config/env';
import { WeatherConditions, WindConditions } from '../types';
import { degToCompass } from '../utils/units';

interface CurrentWeatherResponse {
  wind: { speed: number; deg: number; gust?: number };
  main: { temp: number };
  weather: { main: string; description: string }[];
  sys: { sunrise: number; sunset: number };
}

export interface ForecastBlock {
  time: string;
  windSpeedMph: number;
  windDeg: number;
}

interface ForecastResponse {
  list: { dt: number; wind: { speed: number; deg: number } }[];
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
    },
  };
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
  }));
}

const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export function degToCompass(deg: number): string {
  const index = Math.round(((deg % 360) / 22.5)) % 16;
  return COMPASS_POINTS[(index + 16) % 16];
}

export function metersToFeet(m: number): number {
  return m * 3.28084;
}

export function feetToMeters(ft: number): number {
  return ft / 3.28084;
}

export function mpsToMph(mps: number): number {
  return mps * 2.23694;
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

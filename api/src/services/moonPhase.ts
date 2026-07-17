import { MoonConditions } from '../types';

const SYNODIC_MONTH_DAYS = 29.53058867;
// 2000-01-06 18:14 UTC — a known new moon, used as the reference epoch for
// the phase calculation below.
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0);

export function getMoonPhase(date: Date): MoonConditions {
  const diffDays = (date.getTime() - KNOWN_NEW_MOON_UTC) / 86_400_000;
  const phaseFraction = (((diffDays % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
  const ageDays = phaseFraction * SYNODIC_MONTH_DAYS;
  const illumination = (1 - Math.cos(2 * Math.PI * phaseFraction)) / 2;

  let phaseName: string;
  if (phaseFraction < 0.03 || phaseFraction > 0.97) phaseName = 'New Moon';
  else if (phaseFraction < 0.22) phaseName = 'Waxing Crescent';
  else if (phaseFraction < 0.28) phaseName = 'First Quarter';
  else if (phaseFraction < 0.47) phaseName = 'Waxing Gibbous';
  else if (phaseFraction < 0.53) phaseName = 'Full Moon';
  else if (phaseFraction < 0.72) phaseName = 'Waning Gibbous';
  else if (phaseFraction < 0.78) phaseName = 'Last Quarter';
  else phaseName = 'Waning Crescent';

  // New and full moons produce spring tides (wider tidal range, more beach
  // exposed at low tide) — the scoring engine rewards proximity to these.
  const isSpringTide = phaseFraction < 0.05 || phaseFraction > 0.95 || Math.abs(phaseFraction - 0.5) < 0.05;

  return { phaseName, phaseFraction, ageDays, illumination, isSpringTide };
}

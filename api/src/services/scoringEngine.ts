import { NormalizedConditions, ScoreFactor, ShellingScoreResult, TideEvent } from '../types';

// --- Phase 1 deterministic weighting -----------------------------------
// Total: 100 points across the 7 factors requested for MVP Phase 1. Weights
// reflect general shelling wisdom (lower tide exposes more beach, falling
// tide keeps exposing new ground, spring tides from new/full moons widen
// the tidal range, calm-to-moderate wind/wave action makes shells visible
// without being dangerous). Wind *direction* can't be scored precisely
// without a beach's compass orientation (a Phase 2 geographic factor tied
// to saved_locations), so it currently contributes a flat half-credit with
// an explanation noting the limitation rather than fabricating precision.
const WEIGHTS = {
  tideLevel: 30,
  tidalMovement: 15,
  windSpeed: 15,
  windDirection: 10,
  waveHeight: 15,
  moonPhase: 10,
  timeOfDay: 5,
};

function closenessToLow(conditions: NormalizedConditions): number {
  const { tide } = conditions;
  if (!tide) return 50;
  const next = tide.nextEvents[0];
  if (!next || tide.percentToNextExtreme === null) return 50;

  if (tide.movement === 'falling' && next.type === 'low') return tide.percentToNextExtreme;
  if (tide.movement === 'rising' && next.type === 'high') return 100 - tide.percentToNextExtreme;
  if (tide.movement === 'slack') return next.type === 'low' ? 95 : 5;
  return 50;
}

function scoreTideLevel(conditions: NormalizedConditions): ScoreFactor {
  if (!conditions.tide) {
    return {
      key: 'tideLevel',
      label: 'Tide Level',
      points: Math.round(WEIGHTS.tideLevel * 0.5),
      maxPoints: WEIGHTS.tideLevel,
      explanation: 'NOAA tide data is temporarily unavailable — assuming average conditions.',
    };
  }
  const closeness = closenessToLow(conditions);
  const points = Math.round((closeness / 100) * WEIGHTS.tideLevel);
  const explanation =
    closeness > 70
      ? 'Tide is near a low, exposing more of the beach and sandbars.'
      : closeness > 40
      ? 'Tide is moderately exposed — some productive ground is visible.'
      : 'Tide is closer to high, covering most productive shelling ground.';
  return { key: 'tideLevel', label: 'Tide Level', points, maxPoints: WEIGHTS.tideLevel, explanation };
}

function scoreTidalMovement(conditions: NormalizedConditions): ScoreFactor {
  if (!conditions.tide) {
    return {
      key: 'tidalMovement',
      label: 'Tidal Movement',
      points: Math.round(WEIGHTS.tidalMovement * 0.5),
      maxPoints: WEIGHTS.tidalMovement,
      explanation: 'NOAA tide data is temporarily unavailable — assuming average conditions.',
    };
  }
  const closeness = closenessToLow(conditions);
  const { movement } = conditions.tide;
  let points: number;
  let explanation: string;

  if (movement === 'falling') {
    points = WEIGHTS.tidalMovement;
    explanation = 'Tide is falling, continually exposing fresh ground.';
  } else if (movement === 'slack') {
    points = closeness > 50 ? Math.round(WEIGHTS.tidalMovement * 0.85) : Math.round(WEIGHTS.tidalMovement * 0.3);
    explanation = closeness > 50 ? 'Tide is slack near a low — a great window before it turns.' : 'Tide is slack near a high — little exposed ground right now.';
  } else if (movement === 'rising') {
    points = Math.round(WEIGHTS.tidalMovement * (0.25 + (closeness / 100) * 0.5));
    explanation = 'Tide is rising — ground exposed earlier is now being covered.';
  } else {
    points = Math.round(WEIGHTS.tidalMovement * 0.5);
    explanation = 'Tidal movement could not be determined from nearby station data.';
  }
  return { key: 'tidalMovement', label: 'Tidal Movement', points, maxPoints: WEIGHTS.tidalMovement, explanation };
}

function scoreWindSpeed(conditions: NormalizedConditions): ScoreFactor {
  const mph = conditions.wind.speedMph;
  let points: number;
  let explanation: string;
  if (mph <= 3) {
    points = Math.round(WEIGHTS.windSpeed * 0.65);
    explanation = 'Winds are nearly calm — pleasant, though less new material is washing in.';
  } else if (mph <= 15) {
    points = WEIGHTS.windSpeed;
    explanation = 'Light-to-moderate wind is ideal for pushing shells onto the beach.';
  } else if (mph <= 20) {
    points = Math.round(WEIGHTS.windSpeed * 0.6);
    explanation = 'Wind is picking up — surf may start getting choppy.';
  } else if (mph <= 25) {
    points = Math.round(WEIGHTS.windSpeed * 0.25);
    explanation = 'Strong wind — rough surf will make shelling difficult and less safe.';
  } else {
    points = Math.round(WEIGHTS.windSpeed * 0.1);
    explanation = 'Very strong wind — unsafe/poor conditions for shelling.';
  }
  return { key: 'windSpeed', label: 'Wind Speed', points, maxPoints: WEIGHTS.windSpeed, explanation };
}

function scoreWindDirection(conditions: NormalizedConditions): ScoreFactor {
  const points = Math.round(WEIGHTS.windDirection * 0.5);
  const explanation = `Wind from ${conditions.wind.directionCompass} — onshore/offshore effect can't be scored precisely yet without this beach's orientation on file.`;
  return { key: 'windDirection', label: 'Wind Direction', points, maxPoints: WEIGHTS.windDirection, explanation };
}

function scoreWaveHeight(conditions: NormalizedConditions): ScoreFactor {
  const ft = conditions.waves.heightFt;
  let points: number;
  let explanation: string;
  if (ft === null) {
    points = Math.round(WEIGHTS.waveHeight * 0.5);
    explanation = 'No nearby buoy wave data available — assuming average conditions.';
  } else if (ft < 0.5) {
    points = Math.round(WEIGHTS.waveHeight * 0.55);
    explanation = 'Surf is very flat — calm but fewer shells being freshly washed up.';
  } else if (ft <= 1.5) {
    points = Math.round(WEIGHTS.waveHeight * 0.8);
    explanation = 'Gentle surf — good visibility with some wave action.';
  } else if (ft <= 3) {
    points = WEIGHTS.waveHeight;
    explanation = 'Moderate surf — ideal for turning up fresh shells.';
  } else if (ft <= 4.5) {
    points = Math.round(WEIGHTS.waveHeight * 0.5);
    explanation = 'Surf is getting rough — harder to see and less safe.';
  } else {
    points = Math.round(WEIGHTS.waveHeight * 0.15);
    explanation = 'Rough surf — poor visibility and unsafe conditions.';
  }
  return { key: 'waveHeight', label: 'Wave Height', points, maxPoints: WEIGHTS.waveHeight, explanation };
}

function scoreMoonPhase(conditions: NormalizedConditions): ScoreFactor {
  const { phaseFraction, phaseName } = conditions.moon;
  const distToNew = Math.min(phaseFraction, 1 - phaseFraction);
  const distToFull = Math.abs(phaseFraction - 0.5);
  const distToSpring = Math.min(distToNew, distToFull);
  const normalized = Math.max(0, 1 - distToSpring / 0.25);
  const points = Math.round(WEIGHTS.moonPhase * (0.4 + normalized * 0.6));
  const explanation = normalized > 0.6
    ? `${phaseName} brings a wider spring-tide range, exposing more beach at low tide.`
    : `${phaseName} means a smaller neap-tide range — less extra ground exposed.`;
  return { key: 'moonPhase', label: 'Moon Phase', points, maxPoints: WEIGHTS.moonPhase, explanation };
}

function scoreTimeOfDay(conditions: NormalizedConditions, now: Date): ScoreFactor {
  const sunrise = new Date(conditions.weather.sunrise).getTime();
  const sunset = new Date(conditions.weather.sunset).getTime();
  const nowMs = now.getTime();
  let points: number;
  let explanation: string;

  if (nowMs < sunrise || nowMs > sunset) {
    points = Math.round(WEIGHTS.timeOfDay * 0.2);
    explanation = 'It is currently dark — visibility is poor for shelling.';
  } else if ((nowMs - sunrise) / 3_600_000 <= 2) {
    points = WEIGHTS.timeOfDay;
    explanation = 'Early morning — good light and typically fewer people out.';
  } else if ((sunset - nowMs) / 3_600_000 <= 2) {
    points = Math.round(WEIGHTS.timeOfDay * 0.8);
    explanation = 'Late afternoon — good light with fewer crowds.';
  } else {
    points = Math.round(WEIGHTS.timeOfDay * 0.6);
    explanation = 'Midday — decent light, but expect more foot traffic.';
  }
  return { key: 'timeOfDay', label: 'Time of Day', points, maxPoints: WEIGHTS.timeOfDay, explanation };
}

function determineConfidence(conditions: NormalizedConditions): ShellingScoreResult['confidence'] {
  let issues = 0;
  if (!conditions.tide) issues += 2;
  else if (conditions.tide.distanceFeet > 164_000) issues += 1; // ~50km
  if (conditions.waves.heightFt === null) issues += 1;
  else if (conditions.waves.stale) issues += 1;
  if (conditions.waves.distanceFeet !== null && conditions.waves.distanceFeet > 262_000) issues += 1; // ~80km

  if (issues === 0) return 'high';
  if (issues <= 2) return 'medium';
  return 'low';
}

function findBestWindow(conditions: NormalizedConditions): ShellingScoreResult['bestWindow'] {
  if (!conditions.tide) return null;
  const sunrise = new Date(conditions.weather.sunrise).getTime();
  const sunset = new Date(conditions.weather.sunset).getTime();

  const daylightLow = conditions.tide.nextEvents.find((event: TideEvent) => {
    const t = new Date(event.time).getTime();
    return event.type === 'low' && t > sunrise && t < sunset;
  });

  if (!daylightLow) return null;

  const eventMs = new Date(daylightLow.time).getTime();
  const start = new Date(Math.max(sunrise, eventMs - 90 * 60_000));
  const end = new Date(Math.min(sunset, eventMs + 90 * 60_000));

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    reason: 'The 90 minutes on either side of low tide typically expose the most productive ground.',
  };
}

export function computeShellingScore(conditions: NormalizedConditions, now: Date = new Date()): ShellingScoreResult {
  const factors = [
    scoreTideLevel(conditions),
    scoreTidalMovement(conditions),
    scoreWindSpeed(conditions),
    scoreWindDirection(conditions),
    scoreWaveHeight(conditions),
    scoreMoonPhase(conditions),
    scoreTimeOfDay(conditions, now),
  ];

  const score = factors.reduce((sum, f) => sum + f.points, 0);
  const confidence = determineConfidence(conditions);
  const bestWindow = findBestWindow(conditions);

  const explanation = factors.map((f) => f.explanation).join(' ');

  return { score, confidence, bestWindow, explanation, factors, conditions };
}

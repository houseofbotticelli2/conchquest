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

// Scoring is always anchored to this day's low tide (see multiDayForecast.ts
// / conditionsAggregator.ts's referenceTime), so tide.currentLevelFt here is
// effectively the predicted height of *that* low -- not an arbitrary instant.
// A lower (or negative, below-average/spring-tide) low exposes meaningfully
// more beach and sandbar than a shallow neap-tide low, which is what
// actually varies day to day now; closeness-to-low no longer does, since
// every day is deliberately evaluated right at its own low.
function scoreTideLevel(conditions: NormalizedConditions): ScoreFactor {
  if (!conditions.tide || conditions.tide.currentLevelFt === null) {
    return {
      key: 'tideLevel',
      label: 'Tide Level',
      points: Math.round(WEIGHTS.tideLevel * 0.5),
      maxPoints: WEIGHTS.tideLevel,
      explanation: 'NOAA tide data is temporarily unavailable — assuming average conditions.',
    };
  }
  const lowFt = conditions.tide.currentLevelFt;
  let points: number;
  let explanation: string;
  if (lowFt <= 0) {
    points = WEIGHTS.tideLevel;
    explanation = `A strong low (${lowFt.toFixed(1)}ft) — well below average, exposing much more beach and sandbar.`;
  } else if (lowFt <= 0.5) {
    points = Math.round(WEIGHTS.tideLevel * 0.85);
    explanation = `A solid low (${lowFt.toFixed(1)}ft), exposing good productive ground.`;
  } else if (lowFt <= 1.0) {
    points = Math.round(WEIGHTS.tideLevel * 0.6);
    explanation = `A moderate low (${lowFt.toFixed(1)}ft) — some ground exposed, but not a deep exposure.`;
  } else {
    points = Math.round(WEIGHTS.tideLevel * 0.35);
    explanation = `A shallow low (${lowFt.toFixed(1)}ft) — a neap-tide cycle, without much extra ground exposed.`;
  }
  return { key: 'tideLevel', label: 'Tide Level', points, maxPoints: WEIGHTS.tideLevel, explanation };
}

// Movement/closeness-to-low no longer varies (scoring is always anchored a
// minute before a low, so `movement` is always 'slack' and next.type is
// always 'low' by construction) -- tidalRangeFt does vary, though: it's the
// swing between the bracketing high and this low, independent of the low's
// absolute height (Tide Level covers that). A bigger swing means more water
// movement, more material washing in, and more newly-exposed ground -- a
// genuinely different, still-relevant signal from a shallow-but-still-low
// neap tide.
function scoreTidalMovement(conditions: NormalizedConditions): ScoreFactor {
  if (!conditions.tide || conditions.tide.tidalRangeFt === null) {
    return {
      key: 'tidalMovement',
      label: 'Tidal Movement',
      points: Math.round(WEIGHTS.tidalMovement * 0.5),
      maxPoints: WEIGHTS.tidalMovement,
      explanation: 'NOAA tide data is temporarily unavailable — assuming average conditions.',
    };
  }
  const rangeFt = conditions.tide.tidalRangeFt;
  let points: number;
  let explanation: string;
  if (rangeFt >= 2.0) {
    points = WEIGHTS.tidalMovement;
    explanation = `A wide swing (${rangeFt.toFixed(1)}ft) — a strong spring tide pushing in plenty of fresh material.`;
  } else if (rangeFt >= 1.0) {
    points = Math.round(WEIGHTS.tidalMovement * 0.8);
    explanation = `A solid swing (${rangeFt.toFixed(1)}ft) — decent water movement working new ground.`;
  } else if (rangeFt >= 0.5) {
    points = Math.round(WEIGHTS.tidalMovement * 0.5);
    explanation = `A modest swing (${rangeFt.toFixed(1)}ft) — a middling tide, not much extra material moving.`;
  } else {
    points = Math.round(WEIGHTS.tidalMovement * 0.25);
    explanation = `A small swing (${rangeFt.toFixed(1)}ft) — a neap tide, with little water movement to work fresh ground.`;
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
  // Phrased as a neutral hold, not a failure -- the old wording read like
  // an error message and made users think the wind direction was *bad*.
  const explanation = `Wind from ${conditions.wind.directionCompass} — scored neutral until we learn this beach's orientation.`;
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

function findBestWindow(conditions: NormalizedConditions, restrictToDaylight: boolean): ShellingScoreResult['bestWindow'] {
  if (!conditions.tide) return null;
  const sunrise = new Date(conditions.weather.sunrise).getTime();
  const sunset = new Date(conditions.weather.sunset).getTime();

  const candidateLow = conditions.tide.nextEvents.find((event: TideEvent) => {
    if (event.type !== 'low') return false;
    if (!restrictToDaylight) return true;
    const t = new Date(event.time).getTime();
    return t > sunrise && t < sunset;
  });

  if (!candidateLow) return null;

  const eventMs = new Date(candidateLow.time).getTime();
  let start = eventMs - 90 * 60_000;
  let end = eventMs + 90 * 60_000;
  if (restrictToDaylight) {
    start = Math.max(sunrise, start);
    end = Math.min(sunset, end);
  }

  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    lowTideTime: candidateLow.time,
    reason: 'The 90 minutes on either side of low tide typically expose the most productive ground.',
    isDaylight: start >= sunrise && end <= sunset,
  };
}

export function computeShellingScore(
  conditions: NormalizedConditions,
  now: Date = new Date(),
  restrictShellingToDaylight = false
): ShellingScoreResult {
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
  const bestWindow = findBestWindow(conditions, restrictShellingToDaylight);

  const explanation = factors.map((f) => f.explanation).join(' ');

  return { score, confidence, bestWindow, restrictShellingToDaylight, explanation, factors, conditions };
}

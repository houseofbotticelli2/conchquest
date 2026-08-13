# Shellcast: what's live vs. forecast, box by box

Internal reference for what each box on the Shellcast screen actually represents, and what changes when you tap through to its breakdown. None of it is "right now" except two specific exceptions (called out below).

## Multi-day forecast: the reference time, not "now"

Every day in the day strip (today included) is scored against **that day's low tide**, not the literal current instant. `multiDayForecast.ts` picks the day's lowest low tide (`selectDayLowTide`) and scores against a time one minute before it (`referenceTime`). If a day has no low tide in its window, it falls back to solar-noon midpoint. `restrictShellingToDaylight` never affects this — it only controls what `findBestWindow` is willing to *display*, not what instant is scored.

This `referenceTime` is the anchor for almost everything else on the screen — the score, the pills, the Conditions box. Keep it in mind for every section below.

## The score + pills

| Pill | Source | Live or forecast? |
|---|---|---|
| **TIDE** | `deriveTideConditions` at `referenceTime` | Predicted height at that day's low tide — never a live water-level reading, even for today. |
| **WIND** | `nearestForecastBlock(forecastBlocks, referenceTime)` | Forecast block nearest the low-tide time. Even today, if the low is hours away, this is that hour's forecast, not the current live reading. |
| **WAVES** | `getWaveConditions(lat, lon, referenceTime)` — today only | **Exception #1: real-time.** Today's waves are a live NDBC buoy reading (or Open-Meteo marine fallback). Future days show `N/A` (`stale: true`) since no wave forecast source exists at all — deliberately not reusing today's reading for a day that hasn't happened. |

### Tapping the score ring → breakdown (`Detail`/`StrategyDetail.tsx`)

Tapping the score ring navigates to the factor breakdown. `StrategyDetail.tsx` repeats only the low-tide time as plain text (`Low tide: {time}`) — it does not show wind or wave values a second time.

## The "Best Window" box

### Whether a day has one at all

`findBestWindow` (`api/src/services/scoringEngine.ts:199-228`) returns `null` when there's no tide data, or (if `restrictShellingToDaylight` is on) no low tide falls between sunrise and sunset. It's always computed and always attached to the response — the box itself is never hidden, it just renders a "no window" state instead (see below). `restrictShellingToDaylight` doesn't hide the box; it changes both what counts as a qualifying window *and* the no-window reason text shown.

### States on the Score screen (`Score.tsx`)

- **Upcoming** (default) — window exists, not yet started, not yet ended: shows the time range + reason text, no badge.
- **Happening now** — `windowIsNow` true (via `isWithinWindow`, `mobile/src/lib/forecastFormat.ts:26-29`): green/active `NowBadge` shown.
- **Already passed** — `windowIsPast` true (`isPastWindow`, `forecastFormat.ts:34-36`): gray `NowBadge variant="past"`.
- **No window** — `result.bestWindow` is null: "No shelling window {today|day label}" with a reason — "low tide falls at night, outside daylight hours" if `restrictShellingToDaylight` caused it, otherwise "No low tide data available" (`Score.tsx:277-284`).

### Tapping the Best Window box → breakdown (`StrategyDetail.tsx`)

Tapping the Best Window card (or the score ring, a separate route to `Detail`) passes `result`/`dayOffset`/`isToday` to `StrategyDetail`. That screen **independently recomputes** the same `isWithinWindow`/`isPastWindow` booleans and renders the identical badge/no-window logic — so the breakdown screen can show a different state than what you saw a moment ago on Score if time has ticked past the window in between.

`StrategyDetail` additionally fetches an AI-generated strategy write-up, passing `windowIsPast` through as `bestWindowAlreadyPassed` (`StrategyDetail.tsx:42` → `api/routes/score.ts:64-95` → `shellingStrategy.ts`). The backend prompt is explicitly instructed: if the window already passed, describe it in past tense ("today's best window was earlier..."); otherwise phrase it as forward-looking advice. So the same boolean drives both the visual badge *and* the tense of the generated strategy text.

Today vs. future days: there's no explicit `isToday` branch in this badge logic — it falls out naturally from real timestamps. A future day's window `start`/`end` are always ahead of `Date.now()`, so `windowIsNow`/`windowIsPast` are structurally always `false` for non-today days, meaning **no badge ever renders on a future day** — not because it's disabled, just because a future window literally can't be "now" or "past" yet. Wording differs only cosmetically (`"today"` vs. the day's label).

## The "Conditions {today}" box

The temp/conditions summary box on the main Score screen (`Score.tsx:313-319`, `Eyebrow>Conditions {sentenceLabel}`) reads `result.conditions.weather.tempF`/`.conditions` — the same `weather` object built in `multiDayForecast.ts` from `nearestForecastBlock(forecastBlocks, referenceTime)`. Same rule as tide/wind: it's the **forecast at that day's low tide**, not the current temperature/conditions outside right now, even on today's card. Sunrise/sunset shown alongside it are the real values for that day (not low-tide-dependent).

`weather.uvIndex` is **exception #2: live-only**, for a different reason than waves — UV isn't forecastable via the current provider, so only `isToday` gets a real value (`multiDayForecast.ts:135-138`); future days get `null`.

### Tapping the Conditions box → breakdown (`ConditionsDetail.tsx`)

This screen shows the same low-tide-referenced temp/conditions/UV summary, plus an hourly forecast strip that is **genuinely different** from everything else on this doc: `getHourlyTrend` (`api/src/services/hourlyTrend.ts`) is not anchored to the low tide at all. For today (`dayOffset === 0`) it starts from right now (`Math.max(dayStart, now)`) and runs to end of day; for future days it starts at that day's morning. This is the only place on the whole Shellcast/Conditions surface where "today" actually means "from now forward," rather than "the forecast for today's low tide."

## Why this matters

If a tester says "the wind/temp pill doesn't match what I'm feeling right now," that's expected, not a bug — it's the forecast for the low-tide window, which may be hours from now. Only waves (today's card) and UV (today's card) are genuine live readings, plus the hourly strip inside the Conditions breakdown.

Source: `api/src/services/multiDayForecast.ts` (lines ~90-165), `api/src/services/scoringEngine.ts` (lines ~199-228), `api/src/services/hourlyTrend.ts`, `mobile/src/screens/forecast/Score.tsx`, `mobile/src/screens/forecast/StrategyDetail.tsx`, `mobile/src/screens/forecast/ConditionsDetail.tsx`.

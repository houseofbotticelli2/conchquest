export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatTimeShort(iso: string): string {
  // "8:15 AM" -> "8:15a", to fit the narrow day-strip chip.
  return formatTime(iso).replace(' ', '').replace('AM', 'a').replace('PM', 'p');
}

// The "next low tide" shown alongside a given day's card can roll into the
// following calendar day (e.g. a late-night low). Compares against the day
// actually being *viewed* (not the real device "today"), so tapping ahead to
// Wednesday and seeing a low that rolls into Thursday correctly says "(Thu)"
// instead of "(tomorrow)" -- which would be wrong relative to Wednesday, and
// would also fire on every future day tab regardless of which one you're on.
export function relativeDaySuffix(targetIso: string, viewedDate: string): string {
  const target = new Date(targetIso);
  const viewed = new Date(`${viewedDate}T12:00:00Z`);
  if (target.toDateString() === viewed.toDateString()) return '';
  return ` (${target.toLocaleDateString('en-US', { weekday: 'short' })})`;
}

// Both timestamps carry the actual date, not just a time-of-day -- comparing
// against Date.now() directly is correct for any day (a future day's window
// can never contain "now" without needing a separate isToday check).
export function isWithinWindow(startIso: string, endIso: string): boolean {
  const now = Date.now();
  return now >= new Date(startIso).getTime() && now <= new Date(endIso).getTime();
}

// Whether the real current instant has already passed this window's end --
// only meaningful for a window that's actually elapsed (a future day's window
// end is always ahead of "now", so this only ever fires for today's window).
export function isPastWindow(endIso: string): boolean {
  return Date.now() > new Date(endIso).getTime();
}

function timeOfDayMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

// Tides are semi-diurnal -- a day can have a low tide before sunrise AND
// another one later that's actually usable. The literal "next" low tide
// chronologically isn't necessarily the one behind a day's best-window
// score, so flag it when it falls outside daylight rather than implying
// it's the window to plan around.
export function daylightNote(lowTideIso: string, sunriseIso: string, sunsetIso: string): string | null {
  const t = timeOfDayMinutes(lowTideIso);
  const sunrise = timeOfDayMinutes(sunriseIso);
  const sunset = timeOfDayMinutes(sunsetIso);
  if (t < sunrise) return 'before sunrise, not a usable window';
  if (t > sunset) return 'after sunset, not a usable window';
  return null;
}

// Every multi-day date is a plain YYYY-MM-DD label, not tied to the user's
// timezone (this app has no per-user timezone info anywhere) -- parsing at
// noon UTC keeps the weekday name stable regardless of device timezone.
export function weekdayLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short' });
}

export function weekdayFull(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long' });
}

export function dayChipLabel(index: number, date: string): string {
  if (index === 0) return 'Today';
  return weekdayLabel(date);
}

export function daySentenceLabel(index: number, date: string): string {
  if (index === 0) return 'today';
  if (index === 1) return 'tomorrow';
  return weekdayFull(date);
}

/**
 * How a find's date is written, in one place.
 *
 * There were four copies of this function -- My Shells, Map, Find detail and
 * Profile -- and Profile's had dropped `year`, so the same shell read "Jul 21"
 * on your Profile and "Jul 21, 2026" everywhere else. Nothing was wrong with
 * the data; four copies of one line was enough to make it look wrong.
 */
export function formatFindDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

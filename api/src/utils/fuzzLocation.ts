const EARTH_RADIUS_M = 6_371_000;

// Simple deterministic string hash (FNV-1a) — good enough for seeding a
// fuzz offset, not for any security-sensitive purpose.
function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function seededFraction(seed: string): number {
  return hashString(seed) / 0xffffffff;
}

export interface LatLon {
  lat: number;
  lon: number;
}

/**
 * Offsets a coordinate by a deterministic pseudo-random distance (up to
 * radiusMeters) and bearing, both derived from `seed` — the same seed
 * always produces the same fuzzed point, so a given find doesn't jump
 * around the map between requests, but the offset isn't reversible by
 * simply re-deriving it without knowing the seed was a find id.
 */
export function fuzzLocation(point: LatLon, seed: string, radiusMeters: number): LatLon {
  if (radiusMeters <= 0) return point;

  const bearing = seededFraction(`${seed}:bearing`) * 2 * Math.PI;
  // sqrt() keeps the fuzzed point uniformly distributed over the disk area
  // rather than clustered near the true location.
  const distance = Math.sqrt(seededFraction(`${seed}:distance`)) * radiusMeters;

  const angularDistance = distance / EARTH_RADIUS_M;
  const lat1 = (point.lat * Math.PI) / 180;
  const lon1 = (point.lon * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lon: (lon2 * 180) / Math.PI,
  };
}

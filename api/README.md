# Conchquest API (Phase 1)

Node.js + Express backend: environmental data aggregation, deterministic Shelling Score, Supabase-authenticated shell find logging.

## Stack

- Express + TypeScript
- PostgreSQL + PostGIS (raw `pg`, no ORM) — hosted on Railway
- Supabase Auth (JWT verified server-side against the project's published JWKS)
- NOAA Tides & Currents (tide predictions) + NOAA NDBC buoys (wave height) + OpenWeather (wind/weather)

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, SUPABASE_URL, OPENWEATHER_API_KEY, BUCKET_*
npm run migrate:up     # creates postgis/pgcrypto extensions + all tables
npm run dev            # http://localhost:3000
```

## Endpoints

All routes except `/health` require `Authorization: Bearer <supabase-access-token>`.

- `GET /health` — public liveness check
- `GET /api/conditions?lat=&lon=` — normalized tide/wind/wave/weather/moon data, cached in Postgres
- `GET /api/score?lat=&lon=` — Shelling Score (0-100), confidence, best window, factor-by-factor explanation
- `POST /api/finds` — log a find: `{ lat, lon, speciesId?, foundAt?, condition?, notes?, photoKey?, isPrivate? }`
- `GET /api/finds?limit=&offset=` — list the current user's finds
- `GET /api/finds/:id` — a single find owned by the current user
- `GET /api/finds/nearby?lat=&lon=&radiusFeet=&limit=` — community finds within a radius (everyone's, not just the caller's). Private finds get their location fuzzed by a configurable radius (`app_config` table, keys `fuzz_radius_standard_feet` / `fuzz_radius_rare_feet`) rather than hidden entirely; rare/very_rare species are always fuzzed regardless of their own privacy setting
- `POST /api/uploads/presign` — `{ contentType }` (one of `image/jpeg`, `image/png`, `image/heic`, `image/webp`) → `{ uploadUrl, key }`; the client `PUT`s the photo bytes directly to `uploadUrl` (Railway Bucket, private), then passes `key` as `photoKey` when creating/updating a find

All distances in requests/responses are **feet**, never meters or km — PostGIS/geo-math still operate in meters internally where the underlying functions require it, converted at the API boundary.

## Find photos

The bucket is private, so `shell_finds.photo_key` stores the object key, not a URL. Every response that includes a find (list/detail/nearby) generates a fresh presigned GET URL from that key on the fly (`src/services/storage.ts`, 1 hour expiry) and returns it as `photoUrl` — so `photoUrl` in API responses is time-limited and shouldn't be cached client-side beyond the current session.

## Deploy (Railway)

`railway.json` is set up for Nixpacks auto-detection. On each deploy it runs `npm run migrate:up` before `npm start`, so schema changes ship automatically with the code — set `DATABASE_URL`, `SUPABASE_URL`, `OPENWEATHER_API_KEY`, `BUCKET_ENDPOINT`, `RAILWAY_BUCKET_NAME`, `ACCESS_KEY_ID`, and `SECRET_ACCESS_KEY` in the Railway dashboard's environment variables.

The Postgres plugin needs the PostGIS extension available; if `CREATE EXTENSION postgis` fails on first migration, enable it from the Railway Postgres plugin settings (or connect as a superuser and run it manually) before redeploying.

**`DATABASE_URL` should reference the Postgres service's `DATABASE_PRIVATE_URL` variable** (`${{<postgres-service-name>.DATABASE_PRIVATE_URL}}`), not its public/proxy connection string — the API and database both run inside the same Railway project, so the connection should stay on Railway's private network (no egress fees, not exposed to the public internet). The public connection string is still useful for connecting from outside Railway (psql, a GUI client, etc.) — just don't wire it into the API service itself.

## Not in Phase 1

Messaging, trading, subscriptions, social feed, admin console, and AI/ML scoring (Phases 2-3) are intentionally out of scope here — see the PRD for the full roadmap.

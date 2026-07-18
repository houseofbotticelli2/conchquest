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
cp .env.example .env   # fill in DATABASE_URL, SUPABASE_URL, OPENWEATHER_API_KEY
npm run migrate:up     # creates postgis/pgcrypto extensions + all tables
npm run dev            # http://localhost:3000
```

## Endpoints

All routes except `/health` require `Authorization: Bearer <supabase-access-token>`.

- `GET /health` — public liveness check
- `GET /api/conditions?lat=&lon=` — normalized tide/wind/wave/weather/moon data, cached in Postgres
- `GET /api/score?lat=&lon=` — Shelling Score (0-100), confidence, best window, factor-by-factor explanation
- `POST /api/finds` — log a find: `{ lat, lon, speciesId?, foundAt?, condition?, notes?, photoUrl?, isPrivate? }`
- `GET /api/finds?limit=&offset=` — list the current user's finds
- `GET /api/finds/:id` — a single find owned by the current user

## Deploy (Railway)

`railway.json` is set up for Nixpacks auto-detection. On each deploy it runs `npm run migrate:up` before `npm start`, so schema changes ship automatically with the code — set `DATABASE_URL`, `SUPABASE_URL`, and `OPENWEATHER_API_KEY` in the Railway dashboard's environment variables.

The Postgres plugin needs the PostGIS extension available; if `CREATE EXTENSION postgis` fails on first migration, enable it from the Railway Postgres plugin settings (or connect as a superuser and run it manually) before redeploying.

## Not in Phase 1

Messaging, trading, subscriptions, social feed, admin console, and AI/ML scoring (Phases 2-3) are intentionally out of scope here — see the PRD for the full roadmap.

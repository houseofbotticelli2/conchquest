# Conchquest

Shelling intelligence & discovery app: React Native/Expo mobile client + Node.js/Express API, PostgreSQL+PostGIS on Railway, Supabase Auth, Cloudflare/Railway Bucket for photo storage.

## Working style

- **Confirm before changes.** Explain what you're about to change and get an explicit go-ahead before editing code or config — don't just implement silently.
- Don't scope-creep a fix into a refactor. If something else looks broken while you're in there, mention it, don't fix it unless asked.

## Conventions

- **Feet only.** All distances/measurements are feet everywhere — UI and API. Never introduce metric units.
- **Migrations only.** Schema changes go through `node-pg-migrate` (`npm run migrate:create <name>` in `api/`) — never hand-edit the schema.
- Typecheck before calling something done: `npm run typecheck` in `api/`, `npx tsc --noEmit` in `mobile/`.
- One shared Railway Postgres + one shared Supabase Auth project across all contributors — not a per-person copy. Migrations one person runs apply for everyone.

## Gotchas

- **`Alert.alert` is a no-op on `react-native-web`.** Any confirmation dialog must use `mobile/src/components/ConfirmDialog.tsx` instead, or it'll silently do nothing when running as web.
- **`expo-dev-client`'s version must match the Expo SDK number exactly** (e.g. SDK 57 → `expo-dev-client@~57.0.7`), not whatever `npm install expo-dev-client` picks by default — a mismatched version compiles but fails at the native build step with cryptic Kotlin/Gradle errors.
- The web preview (`expo start --web`, typically port 8082) is a convenience for fast iteration — it does not reflect real device behavior for anything safe-area/notch-related, native modules, or platform-specific APIs. Verify those on a real device build.

## Deploy

- API: Railway auto-deploys `api/` on push to `main`.
- Mobile: EAS Build (dev client) + EAS Update. See `mobile/eas.json` for build profiles.

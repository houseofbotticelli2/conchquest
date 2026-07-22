# Getting Started on Conchquest

Welcome — you've already gone through `docs/ONBOARDING.md` and have your
environment set up (repo cloned, dependencies installed, backend/mobile
running locally, dev client connected). This is the next step: how to
actually start working on the project with Claude Code.

## Overall Architecture

Before touching code, it's worth having a mental map of the pieces and how
they fit together:

- **Mobile app** — React Native + Expo (TypeScript), living in `mobile/`.
  This is the actual Conchquest app someone installs on their phone: screens,
  navigation, the design system, all the map/photo/location features. It
  talks to the backend API over HTTPS and to Supabase directly for
  authentication.
- **Backend API** — Node.js + Express (TypeScript), living in `api/`, hosted
  on **Railway**. Everything the mobile app needs beyond raw auth goes
  through this: shell finds, saved beaches, species library, scoring/
  conditions, photo upload URLs, profile data, push notifications. It's the
  only thing that talks directly to the database and the file bucket — the
  mobile app never does.
- **Database** — PostgreSQL with the **PostGIS** extension (for geospatial
  queries like "finds near this location"), also hosted on Railway. One
  shared database for the whole project, not a separate copy per person —
  see `CLAUDE.md`'s note on this. Schema changes only ever happen through
  migrations (`npm run migrate:create`/`migrate:up` in `api/`), never by
  hand-editing the schema.
- **File storage** — a Railway Bucket (S3-compatible) holding find/profile
  photos. The bucket itself is **private, not publicly accessible** — the
  API generates short-lived presigned URLs for uploading and downloading, so
  a photo is only ever reachable through a URL the API issued to an
  authenticated user, never a permanent public link.
- **Authentication** — **Supabase Auth**. The mobile app authenticates
  directly against Supabase to get a JWT, then sends that token to the
  backend API on every request; the API verifies it before doing anything.
  One shared Supabase Auth project for everyone working on this, same
  reasoning as the shared database.
- **Expo / EAS** — used two different ways: day-to-day, the Expo **dev
  client** lets code changes show up instantly while developing (see
  `docs/ONBOARDING.md`); separately, **EAS Build** produces a real,
  installable standalone app (no dev-client/Metro dependency at all) for
  handing to a tester, and **EAS Update** pushes JS-only updates to those
  installs afterward (see `docs/Standalone Build Guide.docx`).

In short: the phone in your hand only ever talks to two things over the
internet — Supabase (for login) and the Railway-hosted API (for everything
else) — and the API is the only thing with access to the database and the
photo bucket, both of which are private by design.

## Read these first

- **`CLAUDE.md`** (repo root, not in `docs/`) — Claude Code loads this
  automatically, but read it yourself too. It covers working conventions
  (confirm before making changes, feet-only units, schema changes go through
  migrations only) and known gotchas (`Alert.alert` no-op on web,
  `expo-dev-client` version matching, web preview limitations). It has to
  stay at the repo root — that's where Claude Code looks for it.
- **`docs/TODO.md`** — the current list of open and completed work, kept in
  sync with the task tracker. This is where to look for what to work on next.
- **`docs/Standalone Build Guide.docx`** — if you want a permanently installed
  copy of the app on a phone (not the day-to-day dev-client workflow from
  `docs/ONBOARDING.md`), this walks through it in detail. Read it before
  asking Mark for an iOS device registration — it explains exactly which
  steps only he can do (and why) versus what you can do yourself.

## Picking a task

Don't just start reading code cold — ask Claude Code to walk you through the
open items in `docs/TODO.md` and recommend a good first one. Two reasonable starter
tasks if you want a suggestion up front:

- **#66** — Profile avatar "change photo" doesn't work on iOS. Small, isolated,
  forces you to touch the mobile app's photo-picker code without needing to
  understand the whole system first.
- **#65** — Add a Google Maps API key for Android map rendering. Mostly
  configuration, low risk, good way to touch the Google Cloud/Expo config side.

## Ground rules

- **Confirm before changes.** Claude Code should explain what it's about to do
  and get your go-ahead before editing code or config — this is already set as
  a rule in `CLAUDE.md`, but call it out if it starts moving too fast.
- **Ask before pushing.** This is a shared repo and a shared Railway
  Postgres/Supabase Auth project — a migration or push affects everyone
  immediately, not just your own copy.
- **Don't scope-creep.** If you notice something else broken while working on
  a task, mention it (or add it to `docs/TODO.md`) rather than fixing it inline.

## Testing the API directly

`api/test-harness.html` is a standalone HTML page (no build step) for
exercising the API's endpoints directly — health check, conditions, score,
and more — with inline results, separate from the mobile app. Useful when
you're working on the backend and want to check a route without going
through the mobile UI. Open it straight in a browser and point it at your
local API (`http://localhost:3000` by default).

## Designing a screen change before building it

For a small tweak to an existing screen (spacing, wording, a button label),
just describe the change directly and let Claude Code implement it — the
existing components constrain the space enough that this is usually faster.

For a bigger layout change or a new screen, it's often worth designing it
first instead of nudging the real screen back and forth: ask Claude Code to
mock it up as an **artifact** (an HTML/CSS preview using this app's real
fonts/colors from `mobile/src/theme/tokens.ts`) right there in the same
conversation. You react to the mockup the same way you'd give feedback on a
real screen, and once the layout is agreed, Claude Code translates it into
the actual React Native code. This is still the same Claude Code session —
there's no separate design tool or handoff step. Note that a mockup won't
catch every native-only quirk (safe-area insets, platform-specific gesture
behavior, libraries with no web support), so expect some adjustment once it's
implemented for real and tested on a device.

## Your own personal CLAUDE.md

`CLAUDE.md` at the repo root is shared — it's checked into git and applies to
anyone working on this project. If you want standing preferences that apply
to *you* specifically, across any project you touch (not just Conchquest),
create `~/.claude/CLAUDE.md` on your own machine. It's outside the repo, never
committed, and never shared — just your own personal instructions layered on
top of whatever a given project's `CLAUDE.md` already says.

## If you get stuck

Ping Mark for anything needing his accounts (Expo/EAS builds, Apple Developer
device registration, Railway/Supabase credentials) — see `docs/ONBOARDING.md`
for which of those you already have versus what routes through him.

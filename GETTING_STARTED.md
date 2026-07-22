# Getting Started on Conchquest

Welcome — you've already gone through `ONBOARDING.md` and have your environment
set up (repo cloned, dependencies installed, backend/mobile running locally,
dev client connected). This is the next step: how to actually start working on
the project with Claude Code.

## Read these first

- **`CLAUDE.md`** — Claude Code loads this automatically, but read it yourself
  too. It covers working conventions (confirm before making changes, feet-only
  units, schema changes go through migrations only) and known gotchas
  (`Alert.alert` no-op on web, `expo-dev-client` version matching, web preview
  limitations).
- **`TODO.md`** — the current list of open and completed work, kept in sync
  with the task tracker. This is where to look for what to work on next.

## Picking a task

Don't just start reading code cold — ask Claude Code to walk you through the
open items in `TODO.md` and recommend a good first one. Two reasonable starter
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
  a task, mention it (or add it to `TODO.md`) rather than fixing it inline.

## If you get stuck

Ping Mark for anything needing his accounts (Expo/EAS builds, Apple Developer
device registration, Railway/Supabase credentials) — see `ONBOARDING.md` for
which of those you already have versus what routes through him.

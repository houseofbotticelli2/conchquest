# Conchquest Docs

A quick map of what's in this folder and when to reach for each one.

| Doc | Read this when... |
|---|---|
| [`WINDOWS_SETUP.md`](WINDOWS_SETUP.md) | Setting up a Windows machine to run Conchquest locally for the first time. |
| [`MAC_SETUP.md`](MAC_SETUP.md) | Setting up a Mac to run Conchquest locally for the first time. |
| [`GETTING_STARTED.md`](GETTING_STARTED.md) | Your environment is already set up — this covers project architecture, working conventions with Claude Code, and how to pick a first task. |
| [`TODO.md`](TODO.md) | Checking what's done, in progress, or open — kept in sync with the task tracker. |
| [`CHANGELOG.md`](CHANGELOG.md) | Tester-facing record of what shipped in each build, and what's changed since the last one. |
| [`GOOGLE_MAPS_SETUP.md`](GOOGLE_MAPS_SETUP.md) | Creating/restricting the Google Maps API key that Android map rendering needs. |
| [`ANDROID_EMULATOR_SETUP.md`](ANDROID_EMULATOR_SETUP.md) | You need to test an Android build but don't have a physical Android phone. |
| [`STANDALONE_BUILD_GUIDE.md`](STANDALONE_BUILD_GUIDE.md) | Getting a permanently-installed copy of the app onto a phone (not the day-to-day dev-client workflow) — includes the iOS device-registration process. |
| [`TABLEPLUS_DATABASE_ACCESS.md`](TABLEPLUS_DATABASE_ACCESS.md) | You need to browse the shared Postgres database directly with TablePlus, via Railway's private SSH tunnel (no public DB host). |
| `Conchquest PRD - Updated.docx` | The product requirements doc — feature scope and rationale, not implementation detail. |

Also worth knowing about, outside `docs/`:

- **`CLAUDE.md`** (repo root) — working conventions and gotchas Claude Code loads automatically every session. Read it yourself too.
- **`api/test-harness.html`** — a standalone page for exercising API endpoints directly, without going through the mobile app.

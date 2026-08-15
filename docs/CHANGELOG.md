# Conchquest Build Changelog

A running, tester-facing record of what shipped in each build — separate from
`docs/TODO.md` (the contributor task tracker). New entries go at the top.
Build numbers here are the **production/TestFlight** build number
(`eas build --profile production`), not dev-client test builds, unless noted.

## Unreleased (not yet in a numbered build)

Built and committed, pending the next production build + TestFlight submission:

- **Fixed: Map screen resetting on refocus** — panning/zooming to see finds
  elsewhere, then navigating away and back, used to silently snap the data
  back to your original location while the map still looked panned. Now
  stays in sync with wherever you last searched.
- **Fixed: draggable beach-location pin** — the add/edit-beach pin is now
  red while dragging (the old dark navy was hard to see against
  satellite/hybrid map imagery), and adding a new beach now actually
  centers the map on your real location instead of getting stuck on the
  Sanibel fallback.
- **Removed location "vicinity blur"** — a private find used to still show
  up on the community map, just offset within a radius; that middle ground
  is gone. Now it's a plain binary: **Public** = exact location shown to
  everyone, **Private** = hidden from the community entirely, visible only
  to you. This also removes the extra fuzzing that previously applied to
  rare/very_rare species regardless of their own privacy setting.

## Build 4 — v0.1.0 (shipped 2026-08-15)

- **Map clustering + region-based search** — the Map screen's ~30mi search
  cap is gone; zooming out now groups dense areas into a count bubble
  (e.g. "245") instead of a wall of pins, and the map refetches based on
  wherever you've actually panned/zoomed to, not just a fixed circle around
  your starting location.
- **"Current Location" label** — the Shellcast/Map header used to say
  "No Beach" when no beach was selected; now says "Current Location",
  matching the picker sheet's own wording.
- **Autofill on Signup/Login** — name, email, and password fields now hint
  iOS/Android autofill (Keychain, saved passwords).
- **Native password reset (partial)** — tapping the reset-password email
  link can now reopen the app directly and complete the reset natively,
  instead of only ever opening a browser page. Verified via a dev-client
  build; still needs on-device confirmation of the production build before
  it's fully confirmed live for testers. Email confirmation (a separate
  email) is not included in this — it still only opens the browser.

## Build 3 — v0.1.0 (shipped 2026-08-13, tag `ios-build-3`)

- **Report & block** — tap "•••" on any community find (not your own) to
  report it (4 reasons: inappropriate content, harassment, spam, other) or
  block that user. Blocking immediately hides all their finds from your
  map/feed; undo anytime from Profile → Settings → Blocked users.
- **Community Guidelines** — added, linked from Profile → Settings.

## Build 2 — v0.1.0 (shipped 2026-08-10)

- Reworked the Shellcast score row and tide/wind/wave scoring (every day
  now scores against its own low tide, not a live instant); added a "Past"
  badge for an already-elapsed best window.
- Wind compass direction added to the wind chip; wave data falls back to
  Open-Meteo marine data when NDBC has no reading.
- Fullscreen map on tap; date-range filter added to Map and My Shells.
- Daylight-hours shelling restriction moved to a per-user Settings toggle.
- Forgot-password flow wired up (web-based at this point, before native
  reset existed).
- Score/UI cleanup: removed factor emojis and condition filter pills,
  reordered condition pills under the score circle, swapped score colors
  to match red/green intuition.

## Build 1 (dev-client only — never distributed via TestFlight)

Initial internal dev-client build; not a tester-facing release.

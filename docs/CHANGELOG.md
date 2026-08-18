# Conchquest Build Changelog

A running, tester-facing record of what shipped in each build — separate from
`docs/TODO.md` (the contributor task tracker). New entries go at the top.
Build numbers here are the **production/TestFlight** build number
(`eas build --profile production`), not dev-client test builds, unless noted.

## Unreleased (not yet in a numbered build)

Nothing pending -- everything committed so far has shipped.

## Build 7 — v0.1.0 (shipped 2026-08-18)

- **Fixed: the app could hang or show a scary error on a weak signal.** If the
  connection dropped mid-request -- switching between wifi and cellular, or
  coming back to the app after a while -- you'd get a wall of developer text
  ("The network connection was lost... Promise.swift:56") and a dead end. The
  app now quietly retries once, which usually just works. If it still can't
  reach us you get a plain "Couldn't reach Conchquest. Check your connection
  and try again."
- **Requests no longer hang forever.** A dead connection now gives up and
  tells you, instead of leaving a screen spinning. Photo uploads get a much
  longer allowance, since a few megabytes over beach signal takes a while.
- **Behind the scenes:** the app now reaches our servers on our own address
  (`api.conchquest.app`). No difference you can see -- it just means we can
  move things around in future without an app update.

### Also fixed on the server (already live -- no update needed)

- **The Shellcast screen hanging on 2026-08-17.** Nothing to do with your
  phone: the list of NOAA buoy stations was re-downloading on *every* request
  because eight buoys had been retired and confused our "is this list stale?"
  check. Those re-syncs piled up and jammed the database, which is why the
  whole app went slow. Fixed, and the station list now cleans up retired
  buoys on its own.

## Build 6 — v0.1.0 (shipped 2026-08-16)

- **Redesigned for depth** — a tester said the app looked "flat." Every
  surface used to be one of two colors separated by a hairline, with no
  shadows anywhere. Cards now lift off the page, inputs are visibly
  recessed, the Shellcast score sits on a floating disc, and the Best
  Window card stands above the Conditions card instead of matching it.
- **New typeface** — the app is now a single font (Figtree) across four
  weights instead of three mixed typefaces. The "Conchquest" wordmark
  keeps its original serif.
- **Tapping a text field now shows it's selected** — previously nothing
  changed visually, so there was no way to tell which field the keyboard
  was attached to. Buttons also compress when pressed.
- **Fixed: the "Log in" and "Save" buttons looked disabled** even when
  they were perfectly usable.
- **Fixed: viewing someone else's find looked editable** — condition
  rendered as a tappable-looking selector on a screen where nothing is
  editable.
- **Fixed: UV "Extreme" showed in green**, the color that means "good"
  everywhere else in the app. It now follows the same green/gold/coral
  progression as the Shelling Score.
- Score breakdown is now seven separate cards instead of one striped
  column, and the Wind Direction note no longer reads like an error.

## Build 5 — v0.1.0 (shipped 2026-08-15)

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
- **Removed home beach/location line from Profile** — the line under your
  name and shelling-since year is gone.
- **Alt low tide on two-low days** — some days have two low tides; the
  Shellcast/breakdown screens now show the day's *other* low tide (when
  there is one and it hasn't already passed) alongside the existing "Low
  tide" line. Doesn't change which low tide is actually scored.

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

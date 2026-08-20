# Conchquest Build Changelog

A running, tester-facing record of what shipped in each build — separate from
`docs/TODO.md` (the contributor task tracker). New entries go at the top.
Build numbers here are the **production/TestFlight** build number
(`eas build --profile production`), not dev-client test builds, unless noted.

## Unreleased (not yet in a numbered build)

Nothing pending -- everything committed so far has shipped.

## Build 11 — v0.1.0 (shipped 2026-08-20)

- **You can now place the pin when logging a shell.** Drag it to where you
  actually found it — useful if you're logging from the car park, from home
  that evening, or from a photo you took earlier.
- **You can also move it afterwards.** Editing a find now lets you correct the
  location, which previously wasn't possible at all once it was logged.
- **This is also how you control how precise you are.** If you'd rather not
  share the exact spot on a public find, drop the pin nearby instead. Nothing
  is fuzzed behind your back — where you put the pin is what other people see.
- **Fixed: a find could be logged in the wrong place without telling you.**
  If location services were off or hadn't resolved yet, the shell was quietly
  recorded at Sanibel. Now you always see the map and can put the pin right.

## Build 10 — v0.1.0 (shipped 2026-08-19)

- **Favorite beaches, plural.** "Home beach" only ever let you pick one —
  setting a new one quietly unset the last. Now you can favorite as many
  beaches as you like, and the filters are **All · Favorite · Has alert**.
  Your old home beach carried over as your first favorite.
- **The alert threshold now shows on the beach row** (top right, e.g.
  "🔔 70+"), where the HOME badge used to sit. Favorite status isn't marked
  per-row any more — filtering on it is quicker than hunting for a badge.
- **Shells look the same everywhere.** A find shows its photo, species and
  date in every list; condition and notes moved into the expanded view, so
  My Shells, your Profile and the Map all match.
- **Profile's beaches now match the My Beaches screen** rather than having
  their own layout.
- **Fixed: "Recent beaches" on Profile wasn't recent.** Favorites were being
  listed first, so with a few favorites you'd never see a recently added
  beach. It now means what it says.
- Small wording fixes: "Condition:" and "Note:" labels on a shell,
  "Confidence" capitalised, and alerts now read "…reaches a shellcast of 70".

## Build 9 — v0.1.0 (shipped 2026-08-19)

- **Photos load much faster.** Lists were downloading the full-size original
  of every photo just to show a thumbnail — often 1–3 MB each, which is why
  they appeared slowly, one at a time. Lists now use a small version (about
  16× smaller) and only fetch the full photo when you tap to zoom. Your
  originals are untouched, so pinch-to-zoom detail is exactly as it was.
- **My Shells and My Beaches now work the same way.** Tap any shell or beach
  to expand it in place and see the details; tap again to close. Only one
  opens at a time. Editing is now its own screen, reached with the **Edit**
  button inside the expanded item — so you can browse without any risk of
  changing something by accident.
- **You can delete a find.** It's on the edit screen, with a confirmation.
  The photo goes with it.
- **Beaches show their Shelling Score in the list.** At a glance you can see
  which of your saved beaches is worth the trip today.
- **Zoom into your own shells from anywhere.** Tapping a photo in My Shells
  or on your Profile now opens the full-size zoomable view — previously that
  only worked from the Map.
- **Fixed: map pins were different colours** depending on which screen you
  were on. The "this is the place" pin is now red everywhere. (Find pins on
  the community map are still colour-coded by rarity — that's deliberate.)

## Build 8 — v0.1.0 (shipped 2026-08-18)

- **You can now delete your account from inside the app** — Profile →
  Settings → Delete my account. It removes your finds, photos, saved
  beaches, and profile.
- **You get 14 days to change your mind.** Your finds leave the community
  map straight away, but nothing is permanently erased until the window is
  up. Log back in during those two weeks and a banner offers **Restore my
  account**. After that it's gone for good, including from our backups.
- If you can't get into the app for some reason, emailing
  privacy@conchquest.app still works.

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

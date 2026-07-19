# Conchquest TODO

## Set up EAS dev client for on-device testing

Expo Go on the App Store is currently several SDK versions behind the project's
SDK 57, so it can't load the app at all. Set up a custom development build via
EAS Build (`eas-cli`, `eas.json` config, `expo-dev-client` dependency) so the
app can be tested on a real device without depending on Expo Go's SDK version.
Requires an Expo/EAS account.

## Build a real interactive map

Replace the static SVG graphic on the Map screen with a real, pannable map
using `react-native-maps`. Prior discussion favored a lightweight `ShellingMap`
facade component (not a full map-provider abstraction layer) so a future
switch to something like Mapbox stays low-effort. Open question from that
discussion, still unresolved: should the finds list update live as the map is
panned/moved, or only when a cluster/marker is tapped?

## Add home-beach checkbox to Saved beaches add form

Saved.tsx currently auto-marks a user's first saved beach as home (backend
logic in savedLocations.ts POST), with no way to choose at creation time —
only via the Edit row's "SET HOME" link after the fact. Replace with an
explicit checkbox/toggle in the add-beach form.

## Rethink Saved Beaches feature design

Saved beaches currently can't have real distinct locations — there's no
location picker or geocoding, so every beach added gets hardcoded to the same
fixed demo coordinates (Sanibel Island), making the live score/conditions
identical across all saved beaches regardless of name. This makes the feature
not very useful as-is. Needs a broader design discussion once the interactive
map exists — e.g. picking a location from the map, or searching/geocoding a
beach name to real coordinates — before Saved Beaches can work as intended.

## Remaining PRD MVP items (docs/Conchquest PRD - Updated.docx, Section 22)

Of the 11 items the PRD lists as MVP scope, these 4 are not built yet:

- **Social feed** (Section 9) — global/local/following feeds where users
  share finds with photo, approximate location, timestamp, condition, notes.
  Not built at all — the Map screen's nearby-finds list is adjacent but is
  not the social feed the PRD describes.
- **Push notifications** (Section 13) — saved-location alerts, score-
  threshold notifications, tide/post-storm/rare-condition alerts via Firebase
  Cloud Messaging, plus an in-app notification center. Saved beaches already
  store an `alert_threshold_score` per beach, but nothing evaluates
  conditions against it or delivers a notification yet.
- **Premium subscriptions** (Section 17) — RevenueCat-based cross-platform
  entitlement management (Apple/Google), with a defined free vs premium
  feature split. No RevenueCat integration, paywall, or entitlement checks
  exist anywhere in the app.
- **Admin/moderation console** (Section 18) — secure web-based admin app:
  shell library management, content moderation, user moderation, photo
  review, analytics dashboards, feature flags, scoring-rule management.
  Nothing built — `shell_species` data was seeded directly via migration.

Photo upload for finds is now done (Railway Buckets instead of R2 — see
`api/src/services/storage.ts`), so it's dropped from this list.

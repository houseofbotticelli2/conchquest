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

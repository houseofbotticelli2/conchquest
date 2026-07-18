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

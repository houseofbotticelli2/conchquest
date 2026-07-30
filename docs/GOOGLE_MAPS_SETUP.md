# Google Maps API Key Setup (Android)

Tracks task #65. Without this, `react-native-maps` won't render map tiles
on Android (iOS is unaffected -- it uses Apple Maps by default, no Google
key required).

## 1. Create the key in Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and
   create a new project (or pick an existing one) -- e.g. "Conchquest".
2. Go to **APIs & Services → Library**, search for **"Maps SDK for
   Android"**, and enable it. (Skip "Maps SDK for iOS" -- not needed.)
3. Go to **APIs & Services → Credentials → Create Credentials → API key**.
   This generates the key.

## 2. Restrict the key (don't skip this)

An unrestricted Google Maps key is a real liability if it ends up in a
public repo or a decompiled app. On the key's edit page:

- **Application restrictions** → "Android apps" → add:
  - Package name: `com.conchquest.app` (matches `mobile/app.json`)
  - SHA-1 certificate fingerprint of the app's signing certificate --
    for an EAS-built app, get this by running:
    ```bash
    eas credentials
    ```
    then selecting Android → the build profile → it shows the keystore's
    SHA-1. (If there's no Android EAS build yet, EAS generates a keystore
    on the first Android build, and the fingerprint can be fetched after.)
- **API restrictions** → restrict to just "Maps SDK for Android".

With both restrictions in place, this key is safe to commit -- Google's
own guidance is that a properly package+fingerprint-restricted Android
Maps key isn't sensitive the way an unrestricted one would be.

## 3. Add it to `mobile/app.json`

**Important:** the key must go through `react-native-maps`' own config-plugin
option in the `plugins` array -- **not** the generic
`android.config.googleMaps.apiKey` field. `react-native-maps` ships its own
Expo config plugin, which takes priority; if that plugin's option is left
unset, it actively *strips* any Maps API key meta-data from the built
manifest, even if `android.config.googleMaps.apiKey` is set. This fails
silently at build time -- the build succeeds, but the app crashes at runtime
with `RuntimeException: API key not found` the moment a map screen opens.

In the `plugins` array, change:

```json
"react-native-maps"
```

to:

```json
[
  "react-native-maps",
  {
    "androidGoogleMapsApiKey": "YOUR_KEY_HERE"
  }
]
```

Don't add anything under `android.config.googleMaps` -- it's a dead end for
this package and just invites confusion later.

## 4. Rebuild

This is a native config change, not a JS change -- it won't take effect
from just reloading the app. A new EAS build is required:

```bash
eas build --platform android --profile development
```

(or whichever profile is normally used).

Once deployed, task #65 is resolved and the map will render tiles on
Android -- which also unblocks a map-based location picker as a future
option for manually setting a beach's location.

No Android device to verify on? See `docs/ANDROID_EMULATOR_SETUP.md` for
running the rebuilt app in an emulator, including how to directly confirm
the API key actually made it into a given build's manifest by inspecting it
rather than trusting build success alone.

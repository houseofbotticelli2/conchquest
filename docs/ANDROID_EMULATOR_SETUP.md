# Android Emulator Setup

For anyone without a physical Android phone who still needs to test an Android build (a dev-client build, per `docs/WINDOWS_SETUP.md`/`docs/MAC_SETUP.md`, or a standalone build, per `docs/STANDALONE_BUILD_GUIDE.md`) — an Android Studio emulator is a full stand-in for a real device.

## 1. Install Android Studio

Download from [developer.android.com/studio](https://developer.android.com/studio). This bundles the Android SDK and emulator tools.

## 2. Create a virtual device (AVD)

- Open Android Studio → **More Actions → Virtual Device Manager** (or the device icon in the toolbar)
- **Create Device**
- Pick a modern phone profile (e.g. Pixel 8) → Next
- Pick a system image with **Google Play** capability (needed for the Google Maps SDK to work) — a recent API level like 34 is a safe choice; download it if needed → Next → Finish

## 3. Boot the emulator

Launch it from the Virtual Device Manager (▶ icon), or from a terminal:

```bash
emulator -list-avds
emulator -avd <avd_name>
```

## 4. Install a build on it

Once an `eas build` finishes, EAS gives a download link/QR code for the `.apk` (development and preview profiles both produce a directly-installable `.apk`). Either:

- **Drag-and-drop** the downloaded `.apk` file directly onto the running emulator window, or
- Use `adb`:
  ```bash
  adb install path/to/your-build.apk
  ```

### Getting `adb` on your PATH

`adb` ships with the Android SDK but isn't on your shell's PATH by default. On macOS it's typically at:

```bash
~/Library/Android/sdk/platform-tools/adb
```

Add it permanently by putting this in `~/.zshrc` (or the equivalent shell profile on Windows/WSL), then reload the shell:

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
```

If that directory doesn't exist, check **Android Studio → Settings → Languages & Frameworks → Android SDK** — the actual SDK path is shown at the top there.

Confirm the emulator is visible before using `adb`:

```bash
adb devices
# List of devices attached
# emulator-5554   device
```

## 5. Setting a mock GPS location

This is the part that's easy to get wrong: **the emulated phone's own Settings app does not let you set a fake location** — toggling location there only turns location services on/off, it doesn't move the device. To actually simulate being somewhere else:

1. Find the `···` (More) icon on the emulator's side toolbar and open **Extended Controls**.
2. Go to the **Location** tab.
3. Enter a latitude/longitude (or search a place name), then click **Send** (or "Set Location").

That pushes a real mock GPS fix to the emulator's location provider. Conchquest re-fetches location on screen focus, not continuously — after sending a new location, switch away from and back to the screen you're testing (e.g. Map or Shellcast) to see it pick up the change.

## 6. Verifying a native config change actually took effect

Native config changes (like a new permission, or the Google Maps API key — see `docs/GOOGLE_MAPS_SETUP.md`) only take effect in a **new build**, and it's worth directly confirming the installed app actually has what you expect rather than assuming the build succeeded correctly:

```bash
# Find the installed app's APK path on the emulator
adb shell pm path com.conchquest.app

# Pull it locally
adb pull /data/app/.../base.apk /tmp/installed.apk

# Inspect the manifest with the SDK's aapt tool (adjust the build-tools version to whatever's installed)
~/Library/Android/sdk/build-tools/<version>/aapt dump xmltree /tmp/installed.apk AndroidManifest.xml | grep -A2 "some.setting.you.expect"
```

This directly answers "did my config change actually make it into this build?" instead of guessing from a runtime error alone.

## Common problems

| Symptom | What it usually means |
|---|---|
| `RuntimeException: API key not found` when opening a map screen | The installed build's manifest has no Google Maps API key meta-data — see `docs/GOOGLE_MAPS_SETUP.md` for the correct place to configure it (it's easy to set it in a way that gets silently dropped during the native build) |
| Moving the "Location" slider in the emulated phone's Settings does nothing | Expected — use Extended Controls → Location (step 5 above) instead, not the device's own Settings |
| `zsh: command not found: adb` | Use the full path (`~/Library/Android/sdk/platform-tools/adb`) or add it to PATH, per step 4 above |
| App screen shows stale data after sending a new mock location | Conchquest only re-fetches location on screen focus — leave and re-enter the screen |

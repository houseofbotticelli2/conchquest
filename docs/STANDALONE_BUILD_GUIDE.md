# Conchquest — Standalone Build Guide

*How to get the app permanently installed on a phone — no laptop running, no
shared Wi-Fi, no Metro server needed at all after install.*

## Who This Guide Is For

This guide is for getting a real, installable copy of Conchquest onto a
phone — yours, a family member's, or anyone helping test the app — that
keeps working on its own afterward. This is different from the day-to-day
development workflow (the "dev client"), which needs a laptop running Metro
nearby and only really works for whoever is actively writing code that day.

Use this guide when you want to hand someone a working app and walk away,
not when you're actively coding and testing changes minute-to-minute.

## The Problem This Solves

Right now, day-to-day development uses the Expo dev-client workflow: someone
runs a command on their laptop that starts Metro (the JavaScript bundler)
and generates a QR code. Testers scan it, and their device fetches the
JavaScript bundle from Metro over the local Wi-Fi network.

That workflow has three real limitations worth spelling out:

- The laptop that started Metro needs to stay on and stay running — close
  the terminal or put the laptop to sleep, and the connection breaks.
- Testers need to be on the same Wi-Fi network as that laptop (there is a
  "tunnel mode" workaround, but it's slower and less reliable).
- Once a device has loaded the JavaScript bundle once, it can keep running
  for a while on that cached copy — but a fresh reload, an app restart, or
  an update will need to reach Metro again to fetch the latest code.

None of that is a real problem while actively developing at a shared table,
but it's a bad fit for "install this on your phone and use it whenever,
from anywhere."

## The Fix: Build a Standalone App

A standalone build (using EAS's "preview" or "production" build profile)
bakes the JavaScript bundle directly into the installed app at build time.
Once installed, the app never talks to Metro or anyone's laptop again — it
only talks to the internet (the Railway-hosted API and Supabase), exactly
the same way any finished, published app works.

The project already has a preview profile configured for this in
`mobile/eas.json`, so no new setup is needed there — it's just a different
command than the one used for day-to-day dev-client work.

For contrast: the **dev client** (covered in `docs/ONBOARDING.md`) is for
active development — it reloads instantly when code changes, but needs
Metro running nearby. A **standalone build** (this guide) is for handing
someone a finished, self-sufficient copy of the app — it never reloads
live, but it needs nothing else running to work.

> **IMPORTANT — Read this before starting**
> Several steps in this guide can only be done by Mark, because they require
> his paid Apple Developer Program account. This is not a workaround-able
> limitation — Apple requires it for installing apps on iPhones outside the
> App Store. The next section spells out exactly which steps those are.

## Who Can Do What

Before diving into steps, it's worth being explicit about which parts of
this process require Mark specifically, and which parts anyone can do on
their own.

| Task | Who can do it | Why |
|---|---|---|
| Run `eas build` to kick off a build | Mark (for now) | Requires being logged into the Expo account that owns this project. Others could get access later if that's ever needed, but for now this goes through Mark. |
| Install the app on an Android phone | Anyone | Android has no device-registration requirement — the install link works for anyone who has it, no gatekeeping at all. |
| Register an iPhone to allow installing the build | Mark only | Requires Mark's Apple Developer Program membership and account access. Apple does not allow this step to be delegated or self-served by a tester. |
| Install the app on an already-registered iPhone | The phone's owner | Once Mark has registered the device and rebuilt (or an existing build already includes it), the tester just opens the install link themselves. |
| Publish an over-the-air (OTA) JS-only update | Mark (for now) | Same reasoning as the build step — goes through the Expo account that owns the project. |

**In short:** if you're setting this up on an iPhone and you are not Mark,
you cannot fully self-serve — you will need to get your device registered
by him first. Android has no such restriction.

## Step-by-Step: Building the App

### Step 0 — Prerequisites (Mark, or whoever is running the build)

- The EAS CLI installed, or available via `npx` — no separate install is
  strictly required since `npx eas-cli` works, but installing it globally
  is faster for repeated use:
  ```
  npm install -g eas-cli
  ```
- Logged into the Expo account that owns this project:
  ```
  eas login
  ```
- A terminal open in the `mobile/` folder of the repo — all `eas` commands
  in this guide assume that working directory.

### Step 1 — Kick off the build

Run one or both of these from the `mobile/` folder, depending on which
platform(s) are needed:

```
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

Each command uploads the project to EAS's cloud build servers. This is not
instant — a build typically takes several minutes to complete, and the
terminal will show progress. When it finishes, EAS prints an install link
(and a QR code that points to that same link) in the terminal, and it's
also visible on the project's page at expo.dev.

Save that link somewhere retrievable (a text to the tester, a note) — it's
needed in the next steps.

### Step 2 — Android testers: installing the app

Android is the simple case — there is no registration step at all.

1. Open the install link on the Android phone (tapping it from a text
   message or email works fine).
2. The browser will download an installable `.apk` file.
3. Open the downloaded file. Android may show a warning about installing
   from an unknown source the first time — this is expected for an app not
   distributed through the Google Play Store; allow it for this install.
4. Once installed, the Conchquest app icon appears on the home screen like
   any other app. It's now fully standalone — no laptop or Wi-Fi dependency
   going forward.

### Step 3 — iOS testers: registration required first

iOS is the case that needs Mark's involvement. Apple's "internal"
distribution method (the one this project uses to install outside the App
Store) requires every individual device to be registered — by its unique
hardware ID (UDID) — to Mark's Apple Developer account **before** that
device is allowed to install the build at all. There is no way around this
from the tester's side; it has to start with Mark.

**What Mark does:**

1. Run the device-registration command from the `mobile/` folder:
   ```
   eas device:create
   ```
2. This generates a unique registration link. Send that link to the tester
   (text/email/however is easiest).
3. Wait for the tester to complete registration (next section) before doing
   anything else.
4. Once the tester confirms they've registered, kick off a new build (Step
   1 again) — this is not optional; see the callout below for why.

**What the tester (iPhone owner) does:**

1. Open the registration link Mark sent, on the iPhone itself, in Safari.
2. Follow the on-screen prompts — this installs a small configuration
   profile that registers the device's UDID.
3. Go to **Settings → General → VPN & Device Management** (on some iOS
   versions this is **Settings → General → Profiles & Device Management**)
   and "trust" the profile that was just installed. This step is easy to
   miss and is the single most common reason registration seems to silently
   not work.
4. Let Mark know registration is done, and wait for the new install link
   (see the callout below for why a new build is needed).
5. Once Mark sends the new install link, open it on the iPhone and follow
   the prompts to install the Conchquest app itself.

> **Why a rebuild is required after registering a new device**
> A provisioning profile — the thing that authorizes an iOS build to run on
> specific devices — bakes in a fixed list of registered device UDIDs at the
> moment the build is created. Registering a new device afterward does not
> retroactively add it to a build that already exists. Any build made
> before a device was registered will simply refuse to install on it, with
> an error that gives no useful detail about why. The fix is always the
> same: register the device first, then create (or reuse) a build that was
> made after that registration.

## Common Problems and What They Mean

| Symptom | What it usually means | Fix |
|---|---|---|
| iPhone says the app "cannot be installed" or refers to an "untrusted developer" | The configuration profile from registration was installed but never trusted | Settings → General → VPN & Device Management → find the profile → Trust |
| iPhone still can't install after registering | The build being installed predates the device's registration | Register the device first (`eas device:create`), then create a new build — order matters |
| Update seems to not include a recent change | The change needed a full rebuild, not an over-the-air update (see next section) | Re-run `eas build --profile preview` for that platform |
| Android shows an "unknown source" warning | Expected and normal — this app isn't distributed via Google Play | Allow the install; this is not a sign anything is wrong |

## Updating the App After the Initial Build

Because the JavaScript is baked directly into the installed app, there are
exactly two ways to ship a change to someone who already has it installed,
and picking the right one matters:

**Full rebuild — needed for any native change**

Re-run the same build command as before (`eas build --profile preview
--platform ios` or `android`). This is the slower option — it goes through
EAS's cloud build servers again and takes several minutes — but it's
required any time the change involves anything beyond pure
JavaScript/TypeScript logic: a new native library, a new permission, an
updated app icon, a change to `app.json`'s native configuration, and so on.
This is the exact same underlying rule that governs when the dev client
needs a fresh EAS build too (see `docs/ONBOARDING.md` and `CLAUDE.md`'s
gotchas section) — native code can only ever be added by a real build,
never by a JS-only push.

**Over-the-air (OTA) update — for JS-only changes**

Publish a JavaScript-only update without rebuilding the app shell at all:

```
eas update --branch preview
```

Testers get this update automatically the next time they open the app with
an internet connection — still no laptop, Metro, or shared Wi-Fi required
at update time either. This only works for changes that are pure
JavaScript/TypeScript — anything touching native code (see above) needs a
full rebuild instead, and an OTA update published against a build that lacks
a needed native module will not make that module magically appear; it'll
likely just error at runtime.

## Quick Reference

| Purpose | Command |
|---|---|
| Log into the Expo/EAS account | `eas login` |
| Build iOS preview (standalone) | `eas build --profile preview --platform ios` |
| Build Android preview (standalone) | `eas build --profile preview --platform android` |
| Register an iPhone tester's device | `eas device:create` |
| List already-registered iOS devices | `eas device:list` |
| Push a JS-only update (no rebuild) | `eas update --branch preview` |

## Glossary

- **EAS (Expo Application Services)** — the cloud service that builds the
  app into a real, installable iOS/Android package and can push JS-only
  updates to already-installed copies.
- **Standalone build** — an installed app with the JavaScript bundle baked
  in at build time; never depends on Metro or a laptop afterward. Contrast
  with the dev client, which fetches JS live from Metro during active
  development.
- **UDID** — a unique identifier for a specific physical iOS device; Apple
  requires this to be registered before a non-App-Store build can install
  on that device.
- **Provisioning profile** — the file that authorizes a specific iOS build
  to run on a specific, fixed list of registered devices; created/updated
  by Apple's systems via EAS, tied to Mark's Apple Developer account.
- **OTA (over-the-air) update** — a JavaScript-only update pushed to
  already-installed standalone builds without a full rebuild; the app
  fetches it automatically next time it's opened with internet access.
- **Apple Developer Program** — Apple's paid membership required to
  distribute iOS apps outside the App Store (including internal/ad-hoc
  testing); this project uses Mark's membership, which is why iOS
  registration steps route through him.

## Security Note

None of this exposes anyone's laptop to inbound connections from the
internet. Metro (used only in the dev-client workflow, not this one) is
LAN-only by default and was never reachable from outside the local Wi-Fi
network. The standalone build described here talks only outbound to
Railway and Supabase — the same as any deployed app. Being off Wi-Fi,
turning off a laptop, or a tester being on a different network never
created any security exposure; it only ever affected whether the
JavaScript bundle could be fetched during active development.

# Conchquest — TestFlight Build Guide

*How to ship a new iOS build to TestFlight testers, without going through
the App Store review process.*

## Who This Guide Is For

This is for getting a build in front of iOS testers via Apple's TestFlight
app, ahead of an actual App Store submission. It's a different path from
`docs/STANDALONE_BUILD_GUIDE.md`'s "preview" build — that one uses ad-hoc
distribution (each tester's device UDID has to be registered individually);
this one goes through App Store Connect and TestFlight, which scales to
external testers by email with no per-device registration at all.

Use this guide once the app is at a point worth sharing more broadly than a
couple of manually-registered devices. Use the standalone build guide
instead for quick one-off installs on a device you can register yourself.

## Prerequisites (one-time)

- An active Apple Developer Program membership ($99/year).
- An app record created in App Store Connect for `com.conchquest.app`
  (App Store Connect → My Apps → New App). This only needs to be done once,
  ever — not per build. Fill in Name, Primary Language, Bundle ID (must
  match `com.conchquest.app` from `mobile/app.json`), and a SKU (any unique
  internal string, e.g. `conchquest-ios` — never shown to users). Leave
  "User Access" as Full Access unless there's a specific reason to restrict
  it. **Do not** fill out the "Prepare for Submission" page (screenshots,
  promotional text, etc.) or click "Add for Review" — that's for an actual
  App Store submission, not TestFlight.
- Logged into the Expo account that owns this project:
  ```
  eas login
  ```

## Step-by-Step: Building and Shipping a TestFlight Build

Run all of these from the `mobile/` folder.

### Step 1 — Build

```
eas build --platform ios --profile production
```

Uploads the project to EAS's cloud build servers and produces a signed
`.ipa` using the `production` profile in `mobile/eas.json` (App Store
distribution type, not ad-hoc). Takes roughly 10–20 minutes.

First time through, this may also prompt to:
- Register the bundle identifier (if not already registered).
- Reuse or create an Apple distribution certificate — reuse the existing
  one if offered.
- Generate a new Apple Provisioning Profile — say **yes**; a build meant
  for App Store/TestFlight distribution needs one scoped for that, distinct
  from any ad-hoc profile used for standalone builds.

### Step 2 — Submit to App Store Connect

```
eas submit --platform ios --latest
```

Uploads the build just created to App Store Connect. May prompt for an
App-Specific Password or to set up an App Store Connect API key — follow
whatever it asks for. After this finishes, Apple takes another 15–60
minutes to finish processing the build before it appears under the
TestFlight tab.

### Step 3 — Invite testers

In App Store Connect: click the **Distribution** dropdown near the top
(next to the app name) and switch from "App Store" to **TestFlight**. The
build from Step 2 should appear there once Apple finishes processing it.

Two ways to add testers, and they behave very differently:

- **External testers** — add by email address to a Beta Testing group. No
  App Store Connect account access is granted to them at all. The
  **first** build sent to an external group requires a one-time Apple
  "Beta App Review" (~24–48 hours); builds after that to the same group
  are typically much faster to clear. This is the right choice for anyone
  outside the project who isn't on the Apple Developer team account.
- **Internal testers** — anyone already on the App Store Connect team (up
  to 100 people). Instant access, no Apple review at all — but adding
  someone as an internal tester means giving them actual "Users and
  Access" membership on the developer account, so this is really only for
  people who are already meant to have that level of access.

Testers install the free **TestFlight** app from the App Store, then
accept the email invite (or a shareable public link, for external testers)
to install Conchquest through it.

## Updating an Existing TestFlight Build

Re-run Steps 1 and 2 (build, then submit) for any new version — there's no
separate "push an update" step distinct from a normal build+submit cycle.
Testers already using TestFlight get notified of the new build
automatically once it finishes processing.

## Quick Reference

| Purpose | Command |
|---|---|
| Log into the Expo/EAS account | `eas login` |
| Build for TestFlight/App Store | `eas build --platform ios --profile production` |
| Submit the latest build to App Store Connect | `eas submit --platform ios --latest` |

## How This Differs From the Standalone Build Guide

| | This guide (TestFlight) | `STANDALONE_BUILD_GUIDE.md` (ad-hoc) |
|---|---|---|
| Build profile | `production` | `preview` |
| Distribution type | App Store / TestFlight | Ad-hoc (internal) |
| iOS tester setup | Add an email address, no device registration | Register each device's UDID via `eas device:create`, then rebuild |
| Scale | Up to 10,000 external testers | Limited by Apple's 100-device-per-year ad-hoc cap |
| Apple review involved | Yes, one-time for the first external-tester build | No |
| Good for | Broader testing ahead of an App Store launch | Quick one-off installs on a device you can register yourself |

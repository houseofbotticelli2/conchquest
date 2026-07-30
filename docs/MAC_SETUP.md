# Conchquest — Mac Setup Guide

This walks through setting up a Mac to run Conchquest locally and work on it with Claude Code. On Windows? Use `docs/WINDOWS_SETUP.md` instead — the two diverge mainly in steps 1-3 (shell/Node/Git); everything from repo access onward is the same.

## 1. Command line tools

macOS's Terminal (or any shell you prefer — zsh is the default) works fine directly, no WSL-style layer needed. If you've never used the command line on this Mac before, installing Xcode's Command Line Tools first gets you `git` and a working `clang`/build toolchain that some npm packages need:

```bash
xcode-select --install
```

## 2. Install Node.js

Use `nvm` (Node Version Manager) rather than installing Node directly, so it's easy to match versions later.

Check https://github.com/nvm-sh/nvm/releases for the current nvm version, then (replacing `v0.40.1` below if a newer one exists):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc
nvm install 24
nvm use 24
node --version   # should print v24.x
```

(This project requires Node >= 18; 24 is what's currently used.)

## 3. Install Git and configure it

If step 1's Command Line Tools install completed, `git` is already available — check with `git --version`. If it's still missing, `brew install git` (installing [Homebrew](https://brew.sh) first if you don't have it) also works.

Then set your identity:

```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

## 4. Get repo access

The repo is at `https://github.com/houseofbotticelli2/conchquest`. Ask Mark to add you as a collaborator on GitHub first — you won't be able to push without that.

Once added, clone it:

```bash
git clone https://github.com/houseofbotticelli2/conchquest.git
cd conchquest
```

## 5. Install dependencies

There are two separate Node projects — the backend API and the mobile app:

```bash
cd api
npm install
cd ../mobile
npm install
cd ..
```

## 6. Set up the backend's environment variables

```bash
cd api
cp .env.example .env
```

Open `.env` and fill in the real values — **ask Mark for these directly** (Slack/text/1Password, not over email/plaintext channels):
- `DATABASE_URL` — the shared Railway Postgres connection string
- `SUPABASE_URL` — the shared Supabase Auth project URL
- `OPENWEATHER_API_KEY`
- `BUCKET_ENDPOINT`, `RAILWAY_BUCKET_NAME`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY` — Railway Bucket (photo storage) credentials

This project shares one Railway Postgres database and one Supabase Auth project across everyone working on it (not a separate copy per person) — so migrations one person runs apply for everyone.

The mobile app doesn't need a `.env` file — its Supabase URL and public anon key are already committed in `mobile/src/lib/supabase.ts` (safe to be public, same as any Supabase client app).

## 7. Run the backend

```bash
cd api
npm run dev
```

This starts the API on `http://localhost:3000` with hot-reload. If you ever need to run a new migration someone added: `npm run migrate:up`.

## 8. Run the mobile app

```bash
cd mobile
npm start
```

This starts the Expo dev server (Metro bundler). From there you have options:
- Press `w` to open the web preview in a browser (fastest for quick UI iteration, but this doesn't reflect real-device behavior — notch/status-bar spacing and native-only features won't show up correctly here).
- Test on a real phone using the **Conchquest dev client** app (not the generic Expo Go app — this project is on a newer Expo SDK than Expo Go currently supports, so it needs a custom dev client build). Ask Mark for the install link. A few things to know:
  - **Android**: just open the link on the phone and install — no extra setup needed. No Android phone handy? See `docs/ANDROID_EMULATOR_SETUP.md` for running the same build in an emulator on your own Mac — this is generally a smoother experience on Mac than Windows since Android Studio's emulator is well-supported on both Apple Silicon and Intel Macs.
  - **iOS**: the build is ad-hoc distributed, which means your specific iPhone has to be registered with Mark's Apple Developer account *before* the install link will work on it — ask Mark to register your device first. You'll also likely need to enable **Settings → Privacy & Security → Developer Mode** on the iPhone (it'll prompt for this and a restart) before the installed app will actually open.
  - Once installed, the dev client needs to connect to a Metro server (the one from `npm start` above) running on the same WiFi network as the phone — pick the one on port 8081 if it shows more than one option.

## 9. Project conventions

There's a `CLAUDE.md` at the repo root covering conventions (feet-only units, migrations-only schema changes, confirm-before-changes working style, known gotchas). Claude Code loads it automatically when you work in this repo — worth a read regardless.

## 10. A note on EAS (build/deploy)

Building a new installable app version (`eas build`) or publishing a JS update to existing installs (`eas update`) goes through Mark's Expo account for now — you don't need your own Expo login to just write code and test via the web preview or an already-installed dev client connected to your own local Metro server. If you end up needing to run builds yourself, that's a quick account/access conversation with Mark first.

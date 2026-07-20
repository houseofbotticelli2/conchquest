# Conchquest — Windows Setup & Contributing Guide

This walks through setting up a Windows machine to run Conchquest locally and work on it with Claude Code.

## 1. Install WSL2 (recommended)

Claude Code and most of this project's tooling (npm, Postgres client, shell scripts) work best in a Unix-like shell. On Windows, that means **WSL2** (Windows Subsystem for Linux).

1. Open PowerShell **as Administrator** and run:
   ```
   wsl --install
   ```
2. Restart when prompted. This installs Ubuntu by default.
3. On first launch of the Ubuntu app, set a username/password (this is separate from your Windows login).
4. From here on, do all the steps below **inside the Ubuntu/WSL terminal**, not PowerShell.

> If you'd rather not use WSL, Git Bash (bundled with Git for Windows) works for basic use, but some commands may behave differently. WSL2 is the smoother path.

## 2. Install Node.js

Use `nvm` (Node Version Manager) rather than installing Node directly, so it's easy to match versions later.

Check https://github.com/nvm-sh/nvm/releases for the current nvm version, then (replacing `v0.40.1` below if a newer one exists):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
node --version   # should print v24.x
```

(This project requires Node >= 18; 24 is what's currently used.)

## 3. Install Git and configure it

Git usually ships with WSL/Ubuntu already — check with `git --version`. If that fails: `sudo apt update && sudo apt install git -y`.

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
  - **Android**: just open the link on the phone and install — no extra setup needed.
  - **iOS**: the build is ad-hoc distributed, which means your specific iPhone has to be registered with Mark's Apple Developer account *before* the install link will work on it — ask Mark to register your device first. You'll also likely need to enable **Settings → Privacy & Security → Developer Mode** on the iPhone (it'll prompt for this and a restart) before the installed app will actually open.
  - Once installed, the dev client needs to connect to a Metro server (the one from `npm start` above) running on the same WiFi network as the phone — pick the one on port 8081 if it shows more than one option.

## 9. Project conventions

There's a `CLAUDE.md` at the repo root covering conventions (feet-only units, migrations-only schema changes, confirm-before-changes working style, known gotchas). Claude Code loads it automatically when you work in this repo — worth a read regardless.

## 10. A note on EAS (build/deploy)

Building a new installable app version (`eas build`) or publishing a JS update to existing installs (`eas update`) goes through Mark's Expo account for now — you don't need your own Expo login to just write code and test via the web preview or an already-installed dev client connected to your own local Metro server. If you end up needing to run builds yourself, that's a quick account/access conversation with Mark first.

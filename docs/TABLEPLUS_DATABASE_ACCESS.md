# Connecting to Postgres with TablePlus (via Railway's SSH tunnel)

Conchquest's shared Postgres database (`conchquest-postgres` on Railway) doesn't
sit on a public host — you connect through a private SSH tunnel that Railway's
CLI opens for you. This doc covers the one-time setup and the actual
day-to-day TablePlus connection steps.

This is the same database everyone on the project shares — see `CLAUDE.md`'s
note on that. You're looking at real, live production data, not a personal
copy.

## One-time setup

### 1. Get added to the Railway project

You need to already be invited to the `conchquest` Railway project/workspace
before any of this works. Ask whoever manages Railway access (Mark) to add
your email.

### 2. Install the Railway CLI

```bash
brew install railway
```

Then log in (opens a browser):

```bash
railway login
```

### 3. Generate an SSH key (if you don't already have one)

Check first:

```bash
ls ~/.ssh
```

If there's no `id_ed25519` (or another key you'd rather use), generate one:

```bash
ssh-keygen -t ed25519
```

Accept the default file location. A passphrase is optional but recommended.

### 4. Register your key with Railway

```bash
railway ssh keys add
```

This auto-detects the key in your SSH agent and registers it with your
Railway account — it's what lets Railway's SSH tunnel authenticate you.

### 5. Link the local repo to the Railway project

From the `api/` folder in this repo:

```bash
cd api
railway link
```

Pick the `conchquest` project and the `dev` environment when prompted.

## Connecting with TablePlus

### 1. Open the tunnel

In a terminal (from `api/`, once linked):

```bash
railway connect conchquest-postgres --tunnel-only --ssh -P 5433
```

- `--tunnel-only` skips launching `psql` and just holds the tunnel open —
  exactly what an external GUI client needs.
- `-P 5433` pins the local port so you don't have to update your TablePlus
  connection every time (Railway picks a random port otherwise).

It prints something like:

```
PostgreSQL tunnel open — point an external client at:

  Host:     127.0.0.1
  Port:     5433
  User:     postgres
  Password: <real password>
  Database: railway

  URL:      postgres://postgres:<password>@127.0.0.1:5433/railway
```

**Leave this terminal window open** — the tunnel only exists while this
command is running. Closing it (or Ctrl+C) disconnects TablePlus.

### 2. Create the TablePlus connection (one-time)

In TablePlus, create a new **PostgreSQL** connection with:

- **Host:** `127.0.0.1`
- **Port:** `5433`
- **User:** `postgres`
- **Password:** the password printed by the tunnel command (paste it once,
  TablePlus saves it)
- **Database:** `railway`

Save it with a clear name like "Conchquest (via tunnel)" so it's obvious this
only works while the tunnel terminal is running.

### 3. Day-to-day use

1. Run the `railway connect ... --tunnel-only --ssh -P 5433` command above in
   a terminal.
2. Connect via the saved TablePlus connection.
3. When you're done, close the terminal (or Ctrl+C) to close the tunnel —
   nothing is left listening or exposed between sessions.

## Troubleshooting

- **"No SSH keys found in your SSH agent"** — run `ssh-add ~/.ssh/id_ed25519`
  (or your key's path) before retrying.
- **"No registered SSH keys found"** — you generated a key but never ran
  `railway ssh keys add` (step 4 above).
- **"Service not found"** — the Postgres service is named `conchquest-postgres`,
  not `postgres`; use the exact name.
- **TablePlus connection refused** — the tunnel terminal probably isn't
  running, or was closed. Reopen it.
- **Port already in use** — another tunnel is still running from an earlier
  session, or you have a local Postgres (Postgres.app, Homebrew) already
  listening on that port. Either close it, or pick a different `-P` port and
  update your TablePlus connection to match.

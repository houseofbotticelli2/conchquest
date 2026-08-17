# Conchquest architecture

How the pieces fit together: five services on Railway, five outside
dependencies, and one laptop holding the only backups.

Read off the live system on 2026-08-17 -- the Railway service list, the three
`railway.json` deploy configs, the bucket contents, and the Supabase user list.
**Update this when the Cloudflare gate lands (#86).**

Line style carries meaning: solid is a runtime request, dotted is build and
deploy, thick is the nightly backup pull, dashed red is planned but not built.

`architecture.png` and `architecture.svg` in this folder are exports of the
diagram below, for slides, chat, or anywhere that won't render mermaid. The
fence is the source; **the images do not update themselves**. After changing
it, regenerate them so they don't quietly disagree with the code:

(First run on a new machine downloads a headless Chrome to
`~/.cache/puppeteer`, roughly 200 MB -- mermaid-cli renders through a real
browser. It looks like a hang; it isn't.)

```bash
npx -y @mermaid-js/mermaid-cli@11 -i <(sed -n '/```mermaid/,/```/p' docs/ARCHITECTURE.md | sed '1d;$d') -o docs/architecture.png -b '#F2ECE4' -w 2400 -s 2
```

```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'ui-sans-serif, system-ui, sans-serif','fontSize':'16px','primaryTextColor':'#0F2A3D','lineColor':'#4A6274','clusterBkg':'#EAE2D6','clusterBorder':'#C9B896','edgeLabelBackground':'#F2ECE4'},'flowchart':{'nodeSpacing':45,'rankSpacing':110,'padding':14,'useMaxWidth':false,'htmlLabels':false}}}%%
flowchart LR
  classDef client  fill:#FBF8F3,stroke:#4A6274,stroke-width:1.5px,color:#0F2A3D,padding:10px
  classDef svc     fill:#FFFFFF,stroke:#0F2A3D,stroke-width:1.5px,color:#0F2A3D,padding:10px
  classDef store   fill:#E7DED0,stroke:#0F2A3D,stroke-width:1.5px,color:#0F2A3D,padding:10px
  classDef ext     fill:#EAE2D6,stroke:#4A6274,stroke-width:1.5px,color:#0F2A3D,padding:10px
  classDef planned fill:#FBF8F3,stroke:#B85862,stroke-width:1.5px,stroke-dasharray:5 4,color:#B85862,padding:10px
  classDef backup  fill:#DCEBE6,stroke:#2E7D6F,stroke-width:1.5px,color:#14453C,padding:10px

  phone["Mobile app<br/>Expo / React Native"]:::client
  visitor["Visitors"]:::client
  you["You<br/>the admin"]:::client

  cf["Cloudflare Access<br/>planned, not built"]:::planned

  subgraph RW ["Railway — project: conchquest"]
    direction TB
    admin["admin<br/>React SPA"]:::svc
    web["web<br/>Astro static site"]:::svc
    api["conchquest-api<br/>Node + Express"]:::svc
    pg[("conchquest-postgres<br/>Postgres 17 + PostGIS")]:::store
    bucket[("Railway Bucket<br/>photos + avatars")]:::store
  end

  supa["Supabase Auth<br/>accounts + JWT"]:::ext
  resend["Resend<br/>SMTP for auth email"]:::ext
  feeds["Data feeds<br/>NOAA · NDBC<br/>Open-Meteo · OpenAI"]:::ext

  subgraph SHIP ["Source & delivery"]
    direction TB
    gh["GitHub<br/>houseofbotticelli2/conchquest"]:::ext
    eas["EAS Build<br/>TestFlight · APK"]:::ext
  end

  subgraph BK ["Nightly backup — 12:30 daily"]
    direction TB
    mac["Your Mac<br/>launchd job"]:::backup
    icloud[("iCloud Drive")]:::backup
  end

  phone -->|"REST · JWT"| api
  phone -->|"sign in"| supa
  phone -->|"direct upload"| bucket
  visitor --> web
  you -->|"no gate today"| admin
  you -.->|"planned"| cf
  cf -.-> admin
  admin -->|"cookie session"| api

  api --> pg
  api --> bucket
  api -->|"verify JWT"| supa
  api --> feeds
  supa -->|"branded email"| resend

  gh -.->|"push to main"| RW
  gh -.-> eas
  eas -.-> phone

  mac ==>|"pg_dump"| pg
  mac ==> bucket
  mac ==>|"user export"| supa
  mac ==> icloud
```

## Inside Railway

| Service | What it is | Reached at |
| --- | --- | --- |
| `conchquest-api` | Node + Express. The only thing that talks to the database. | `api.conchquest.app` |
| `web` | Astro static site -- marketing, privacy, terms, community guidelines. | `www.conchquest.app` |
| `admin` | React SPA for moderation. Authenticates by httpOnly cookie, not JWT. | `admin.conchquest.app` |
| `conchquest-postgres` | Postgres 17 + PostGIS. Finds, beaches, species, reports, blocks. | Private network only |
| Railway Bucket | S3-compatible. Find photos and avatars, uploaded straight from the phone. | Presigned URLs |

Note the one path that bypasses the API: the mobile app uploads photos
**directly** to the bucket using a presigned URL from `api/src/services/storage.ts`.

## Outside Railway

| Service | Its job | What breaks without it |
| --- | --- | --- |
| Supabase Auth | Accounts, JWTs, password reset. Users live here, *not* in Postgres. | Nobody can sign in; finds lose their owner |
| Resend | SMTP behind Supabase's branded confirm/reset emails (#92). | Signup confirmation and password reset stall |
| Data feeds | NOAA tides, NDBC + Open-Meteo marine, OpenAI for the strategy card. | Scores degrade; the app still runs |
| GitHub | Source of truth. Pushing `main` auto-deploys Railway. | No deploys |
| EAS Build | Compiles the mobile app to TestFlight and Android. | No new app builds |

## The backup path

One `launchd` job (`app.conchquest.backup-db`) at 12:30 daily pulls all three
pieces into iCloud. It only runs when Mark's Mac is on -- that is the whole
safety net, because Railway's scheduled backups need the Pro plan and
Supabase's free plan backs up nothing at all. See `docs/TODO.md` #101.

- **Database** -- `scripts/backup-db.sh`: `pg_dump` over an SSH tunnel, and the
  archive is checked for `shell_finds` before it counts as a success. Last 14 kept.
- **Photos** -- `api/scripts/backup-photos.mjs`: every bucket object, additive
  only. It never deletes locally, so an accidental delete in the app can't
  propagate into the backup and destroy the last copy.
- **Accounts** -- `api/scripts/backup-auth.mjs`: the Supabase user list as JSON,
  so restored finds can be reattached to their real owners.

## Two gaps this diagram is honest about

**Cloudflare Access isn't built.** `admin.conchquest.app` is publicly reachable
right now, held only by the cookie login and an admin-role check. DNS still sits
at GoDaddy, and moving it is step one. Tracked as #86.

**Password hashes aren't backed up.** Supabase's Admin API doesn't expose them.
A restore recreates accounts at their original UUIDs -- so finds reattach
correctly -- but everyone resets their password once. Closing that needs a
`pg_dump` of Supabase's own `auth` schema. `api/.env` is also unbacked; it
exists only on Mark's Mac.

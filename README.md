# Uputko

AI health-navigation agent for Croatian citizens — Datathon Portala otvorenih podataka 2026, Challenge A (*Društvo i javne usluge*).

> Opišite problem jednom. Ostalo rješavamo mi.

**Demo URL:** https://uputko.vercel.app · **Status:** see the repo's GitHub Issues → Milestones.

All patient data in this project is synthetic. Uputko never diagnoses; in an emergency call **112**.

## What's inside

| Folder | What |
|---|---|
| `app/` | Next.js 15 patient app (Croatian, accessible, mobile-first) |
| `data-pipeline/` | Python ETL: data.gov.hr CKAN API → clean → geocode → `supabase/seed.sql` |
| `supabase/` | Postgres + PostGIS schema (migrations) and generated seed |
| `docs/data-sources.md` | Every dataset: publisher, licence, date, how it is linked |

## Run locally

Requirements: Node ≥ 20, pnpm, Docker, Python ≥ 3.12.

```bash
# 1. Database (local Supabase in Docker; first start downloads images)
pnpm dlx supabase@3.0.0 start
pnpm dlx supabase@3.0.0 db reset      # migrations + open data + demo personas + slots

# 2. App
cd app
cp .env.example .env.local            # fill in values printed by `supabase start`
pnpm install
pnpm dev                              # http://localhost:3000
```

Database UI (Supabase Studio): http://127.0.0.1:54323

### Try the demo flow (local)

1. http://localhost:3000/profil → pick **Ana** (or Luka / Maja) — synthetic people, real HZZO doctors.
2. **Chat** (`/chat`): describe the problem; the assistant asks a few questions and sends a summary.
   - Emergencies (e.g. "jako me boli u prsima i ne mogu disati") stop the chat and show 112.
   - Luka + city "Varaždin" + toothache → nearest dentist, no referral.
3. **Doctor**: open the "Demo: otvori kao liječnik" link (the same link is emailed to `DEMO_INBOX`),
   upload `app/public/demo/uputnica-ana-orl.png`, check the fields, **Pošalji pacijentu**.
4. **Patient** case page updates live → **Potvrdi termin** → calendar file, directions.
5. **Institution** (`/ustanova`): *Oslobodi raniji termin* → the patient gets an earlier-slot offer;
   after "Ne paše mi" the panel offers matching slots.

### Tests

```bash
cd app
pnpm typecheck && pnpm lint && pnpm test   # unit tests (no network)
pnpm test:e2e                              # Playwright: golden path, emergency, direct (real model, cents)
pnpm eval                                  # 15 scripted patient scenarios against the running app (cents)
```

Abuse protection: chat is limited per visitor (40 messages/hour), per conversation (20) and per day
(800 overall); uputnica reading 10/hour per visitor. Counters live in the `rate_limits` table.

### Rebuild the data

```bash
cd data-pipeline
./build.sh            # offline: committed raw snapshot → data/clean → ../supabase/seed.sql
```

See [`docs/data-sources.md`](docs/data-sources.md) for refreshing from the internet.

### Checks

```bash
cd app && pnpm typecheck && pnpm lint && pnpm test
cd data-pipeline && .venv/bin/python -m pytest -q && .venv/bin/ruff check .
```

## Deploy (Vercel)

Live at **https://uputko.vercel.app** (Vercel project `uputko`, Root Directory `app`).
Every push to `main` deploys to production; other branches get a preview URL.
Env vars from `app/.env.example` are set in Vercel → Project → Settings → Environment Variables
(Production only so far — add them to Preview for branch preview URLs; secrets marked Sensitive). Ask René for access.

For the hosted database: create a Supabase project in the EU (Frankfurt) region, then
`pnpm dlx supabase@3.0.0 link --project-ref <ref>` and `pnpm dlx supabase@3.0.0 db push --remote --include-seed`.
The CLI targets the local database unless you pass `--remote`. The hosted project already exists (Central EU / Frankfurt); ask René for access.

See `CLAUDE.md` and `PLAN.md` for the full plan.

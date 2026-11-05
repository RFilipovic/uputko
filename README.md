# Uputko

AI health-navigation agent for Croatian citizens — Datathon Portala otvorenih podataka 2026, Challenge A (*Društvo i javne usluge*).

> Opišite problem jednom. Ostalo rješavamo mi.

**Demo URL:** TODO (Vercel) · **Status:** see the repo's GitHub Issues → Milestones.

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

1. Import the GitHub repo in Vercel.
2. Set **Root Directory** to `app` (framework preset: Next.js).
3. Add the env vars from `app/.env.example` (Project → Settings → Environment Variables).
4. Every push to `main` deploys.

For the hosted database: create a Supabase project in the EU (Frankfurt) region, then
`pnpm dlx supabase@3.0.0 link --project-ref <ref>` and `pnpm dlx supabase@3.0.0 db push --remote --include-seed`.
The CLI targets the local database unless you pass `--remote`. The hosted project already exists (Central EU / Frankfurt); ask René for access.

See `CLAUDE.md` and `PLAN.md` for the full plan.

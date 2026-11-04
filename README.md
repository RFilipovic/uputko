# Uputko

AI health-navigation agent for Croatian citizens — Datathon Portala otvorenih podataka 2026, Challenge A (*Društvo i javne usluge*).

> Opišite problem jednom. Ostalo rješavamo mi.

**Demo URL:** TODO (Vercel) · **Status:** see the repo's GitHub Issues → Milestones.

All patient data in this project is synthetic. Uputko never diagnoses; in an emergency call **112**.

## Run locally

Requirements: Node ≥ 20, pnpm.

```bash
cd app
cp .env.example .env.local   # fill in keys when needed (not required for Phase 0)
pnpm install
pnpm dev                     # http://localhost:3000
```

Checks (run before every commit):

```bash
pnpm typecheck && pnpm lint && pnpm test
```

## Deploy (Vercel)

1. Import the GitHub repo in Vercel.
2. Set **Root Directory** to `app` (framework preset: Next.js).
3. Add the env vars from `app/.env.example` (Project → Settings → Environment Variables).
4. Every push to `main` deploys.

See `CLAUDE.md` and `PLAN.md` for the full plan.

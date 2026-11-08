# Uputko

*[Hrvatska verzija](README.hr.md)*

AI health-navigation agent for Croatian citizens. **Datathon Portala otvorenih
podataka 2026**, Challenge A (*Društvo i javne usluge*).

> Opišite problem jednom. Ostalo rješavamo mi.

**Live demo:** https://uputko.vercel.app

All patient data in this project is synthetic. Uputko never diagnoses and never
recommends medication; in an emergency call **112**.

---

## The problem

Getting care in Croatia often means going from doctor to doctor, a trip just to
pick up a referral (*uputnica*), guessing which hospital to go to, and several
phone calls to move one appointment. It is hardest for older people, students
and travellers away from their own doctor.

## What Uputko does

The patient describes what is wrong **once**, in plain Croatian (or English).
Everything else happens in the background:

1. **Safety first.** Deterministic rules check every message *before* the AI
   sees it. Emergencies (chest pain with breathing trouble, stroke signs, heavy
   bleeding, suicidal thoughts…) stop the chat and show **112** plus the nearest
   emergency department.
2. **Short intake.** The assistant asks a few focused questions, one at a time.
3. **The right doctor.** Code, not the AI, decides who handles it first: tooth →
   dentist, gynaecological → gynaecologist, child → paediatrician, everything
   else → family doctor. Away from home with a toothache → the nearest open
   dentist in the city you are in, no referral needed.
4. **Doctor loop.** The chosen doctor gets a ready-made summary (never a
   diagnosis) and a secure link, and issues the uputnica.
5. **Appointment.** The earliest free slot at the right hospital is proposed;
   the patient confirms with one tap and gets directions and a calendar file.
6. **Changes by notification.** An earlier slot frees up → *Prihvati / Odbij*.
   The time doesn't suit → *Ne paše mi* → the hospital offers another.

Doctors, hospitals, specialties and locations come from **open data**
(data.gov.hr: HZZO and Grad Zagreb, joined with OpenStreetMap). See
[`docs/data-sources.md`](docs/data-sources.md).

> In reality the e-uputnica is issued in **CEZIH**; our doctor portal stands in
> for that step. Slots, referrals and notifications are synthetic. The path to
> production is in [`docs/architecture.md`](docs/architecture.md).

---

## Try it (no login needed)

There are no passwords. You pick one of three **synthetic** people; their chosen
doctors are real doctors from HZZO open data.

| Persona | Story | What happens |
|---|---|---|
| **Ana Horvat**, 72, Zagreb | Ear pain for two days | Family doctor → uputnica for ORL → appointment at KBC Zagreb |
| **Luka Kovačević**, 21, student in Varaždin, doctors in Osijek | Toothache | Nearest open dentist in Varaždin, no referral |
| **Maja Babić**, 34, Split | Child has a fever | Paediatrician |

1. Open https://uputko.vercel.app → **Opišite problem** → pick **Ana**.
2. Chat: "Boli me uho već dva dana", answer a few questions, press **Pošalji liječniku**.
3. Click **Demo: otvori kao liječnik** (in reality this link arrives by email).
4. In the doctor portal, upload [`app/public/demo/uputnica-ana-orl.png`](app/public/demo/uputnica-ana-orl.png)
   (or download it there), check the fields, **Pošalji pacijentu**.
5. Back on the patient's case page: **Stigla je uputnica!** → **Potvrdi termin**.
6. Hospital side: open `/ustanova` → **Oslobodi raniji termin** → the patient
   gets an earlier-slot offer.
7. Emergency: as Maja, write "jako me boli u prsima i ne mogu disati".

Other pages: `/javni-podaci` (open data used), `/profil` (change persona or doctors).

### Demo-safe mode (for recording)

Open any page with **`?demo=1`** (e.g. `https://uputko.vercel.app/profil?demo=1`)
in **both** the patient's and the doctor's browser:

- If the AI is slow (nothing within 8 s) or fails, the chat continues with a
  prepared conversation for that persona, and reading the sample uputnica falls
  back to its known contents. The recording never stalls.
- `/profil` shows **Počni ispočetka**: clears the personas' old cases and frees
  their slots, for a clean take.
- `?demo=0` turns it off.

---

## Run locally

Requirements: **Node ≥ 20** (we use 22), pnpm 9, Docker, Python ≥ 3.12 (only to
rebuild the data).

```bash
# 1. Database (local Supabase in Docker; the first start downloads images)
pnpm dlx supabase@3.0.0 start          # also applies migrations + seed
pnpm dlx supabase@3.0.0 db reset       # optional: rebuild from scratch

# 2. App
cd app
cp .env.example .env.local             # fill in values printed by `supabase start`
pnpm install
pnpm dev                               # http://localhost:3000
```

Supabase Studio (database UI): http://127.0.0.1:54323

Environment variables are listed and explained in
[`app/.env.example`](app/.env.example): Supabase keys, `ANTHROPIC_API_KEY`,
`RESEND_API_KEY`, `DEMO_INBOX` (every demo email goes **only** there),
`UPUTKO_DEMO_OFFLINE` (demo mode without any AI calls).

> On Node 18 the app fails with `ERR_REQUIRE_ESM`. Without upgrading:
> `npx -y -p node@22 -p pnpm@9 -c 'pnpm dev'`.

## Tests

```bash
cd app
pnpm typecheck && pnpm lint && pnpm test   # 138 unit tests, offline
pnpm test:e2e                              # Playwright, Chromium + Firefox (real AI calls, cents)
pnpm eval                                  # 17 scripted patients against the running app (cents)
E2E_BASE_URL=https://uputko.vercel.app pnpm exec playwright test --project=chromium   # live site

cd ../data-pipeline
.venv/bin/python -m pytest -q && .venv/bin/ruff check .
```

The end-to-end suite covers the golden path, rescheduling and earlier-slot
offers, the emergency path, the direct (toothache) route, demo mode, edge
cases, and automated accessibility checks (axe, WCAG 2.2 AA) at normal and large
text sizes.

Abuse protection: chat is limited to 40 messages/hour per visitor, 20 per
conversation and 800/day overall; uputnica reading to 10/hour per visitor.

## Rebuild the data

```bash
cd data-pipeline
./build.sh     # offline: committed raw snapshot → data/clean → ../supabase/seed.sql
```

Refreshing from the internet (CKAN API, OpenStreetMap, Nominatim) is described
in [`docs/data-sources.md`](docs/data-sources.md#rebuild).

## Deploy

- **App:** Vercel project `uputko` (Root Directory `app`). Every push to `main`
  deploys to production; other branches get a preview URL. Env vars from
  `app/.env.example` are set in Vercel → Settings → Environment Variables.
- **Database:** hosted Supabase project in the EU (`eu-west-1`). New migrations
  after a merge: `pnpm dlx supabase@3.0.0 db push --remote` from the repo root
  (the project must be linked: `pnpm dlx supabase@3.0.0 link --project-ref <ref>`).
  The CLI targets the local database unless you pass `--remote`. Ask René for access.

## Documentation

| Document | What |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | System diagram, flows, safety design, data model (FHIR), scaling, CEZIH / e-Naručivanje / e-Građani path, legal prerequisites |
| [`docs/data-sources.md`](docs/data-sources.md) | Every dataset: publisher, licence, date, how it is linked, limitations |
| [`docs/codebase.md`](docs/codebase.md) | Guide to the code: pages, API, modules, database, tests, common tasks |
| [`README.hr.md`](README.hr.md), [`docs/hr/`](docs/hr/) | Croatian versions of this README and the three documents above |
| [`CLAUDE.md`](CLAUDE.md), [`PLAN.md`](PLAN.md) | Contributor rules and the 5-day plan |

## Repository

| Folder | What |
|---|---|
| `app/` | Next.js 15 app: patient (mobile-first), doctor portal, demo hospital panel |
| `data-pipeline/` | Python ETL: data.gov.hr CKAN API → clean → geocode → `supabase/seed.sql` |
| `supabase/` | Postgres + PostGIS schema (migrations) and the generated seed |
| `docs/` | Architecture, data sources, codebase guide |

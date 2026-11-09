# Uputko

*[Hrvatska verzija](README.hr.md)*

AI health-navigation agent for Croatian citizens. **Datathon Portala otvorenih
podataka 2026**, Challenge A (*Društvo i javne usluge*).

> Opišite problem jednom. Ostalo rješavamo mi.
> *(Describe the problem once. We handle the rest.)*

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
Screenshots of every screen are in [`docs/screenshots/`](docs/screenshots/).

---

## Quality and safety

- Emergency detection is plain code with unit tests for every rule, not AI
  judgement. A second check looks at the urgency the AI reports.
- 138 unit tests, end-to-end browser tests (Chromium and Firefox) for every
  main flow, and 17 scripted patients that check urgency and routing.
- Automated accessibility checks (WCAG 2.2 AA) at normal and large text sizes;
  full keyboard use; a **Veća slova** (larger text) switch; voice input.
- Usage limits protect the service from abuse.

Details: [`docs/architecture.md`](docs/architecture.md).

---

## Run it yourself

Requirements: **Node ≥ 20**, pnpm 9, Docker, and an Anthropic API key.

```bash
# 1. Database (local Supabase in Docker; applies the schema and open-data seed)
pnpm dlx supabase@3.0.0 start

# 2. App
cd app
cp .env.example .env.local             # fill in values printed by `supabase start`
pnpm install
pnpm dev                               # http://localhost:3000
```

All environment variables are explained in [`app/.env.example`](app/.env.example).

The open data can be rebuilt from the committed snapshot with
`cd data-pipeline && ./build.sh` (Python ≥ 3.12). Refreshing it from data.gov.hr
is described in [`docs/data-sources.md`](docs/data-sources.md#rebuild).

## Documentation

| Document | What |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | System diagram, flows, safety design, data model (FHIR), scaling, CEZIH / e-Naručivanje / e-Građani path, legal prerequisites |
| [`docs/data-sources.md`](docs/data-sources.md) | Every dataset: publisher, licence, date, how it is linked, limitations |
| [`docs/codebase.md`](docs/codebase.md) | Guide to the code for developers: pages, API, modules, database, tests, deployment |
| [`README.hr.md`](README.hr.md), [`docs/hr/`](docs/hr/) | Croatian versions of this README and the three documents above |

## Repository

| Folder | What |
|---|---|
| `app/` | Next.js 15 app: patient (mobile-first), doctor portal, demo hospital panel |
| `data-pipeline/` | Python ETL: data.gov.hr CKAN API → clean → geocode → `supabase/seed.sql` |
| `supabase/` | Postgres + PostGIS schema (migrations) and the generated seed |
| `docs/` | Architecture, data sources, codebase guide, screenshots |

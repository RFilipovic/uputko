# Arhitektura / Architecture

Uputko is the **middleman between the patient and the healthcare system**. The
patient describes the problem once, in Croatian (or English). A deterministic
safety layer and an AI agent work out who should handle it, the right doctor
gets a ready-made summary, and the patient gets "come to this hospital at this
time", with changes handled by notification instead of phone calls.

This document describes the prototype as built, how the parts talk to each
other, and the path from prototype to a real service: CEZIH, FHIR, e-Naručivanje,
e-Građani, and the legal prerequisites.

> **Honesty note.** In reality an e-uputnica is issued in **CEZIH** by the
> doctor's certified practice software. Our doctor portal is a stand-in for that
> step. Appointment slots, patients, referrals and notifications in the
> prototype are **synthetic** and labelled as such in the UI. Open data has none
> of them.

---

## 1. System overview

```
  Patient phone (browser)                Doctor (browser, link from email)
  ───────────────────────                ─────────────────────────────────
  chat · case page · maps                portal: summary → upload uputnica
          │  HTTPS + Server-Sent Events          │  HTTPS
          ▼                                      ▼
 ┌──────────────────────── Next.js 15 app on Vercel ────────────────────────┐
 │  Pages (server components): /  /profil  /chat  /slucaj/[id]              │
 │                             /lijecnik/slucaj/[token]  /ustanova          │
 │                             /javni-podaci                                │
 │  API routes:                                                              │
 │   /api/chat ──► red-flag rules ──► Claude agent (tools) ──► routing       │
 │   /api/doctor/[token]/…   /api/appointments/…   /api/notifications/…     │
 │   /api/institution/…  /api/cases/[id]  /api/session  /api/demo/reset     │
 └──────┬───────────────────────────┬────────────────────────┬──────────────┘
        │ SQL (service role)        │ Broadcast (HTTP)        │ HTTPS
        ▼                           ▼                         ▼
 ┌──────────────────────┐   ┌─────────────────────┐   ┌──────────────────────┐
 │ Supabase Postgres    │   │ Supabase Realtime   │   │ Claude API (Haiku)   │
 │ + PostGIS (EU)       │   │ "refresh" pings to  │   │ Resend (demo emails) │
 │ open data + synthetic│   │ the patient's phone │   │ OpenFreeMap tiles    │
 │ patient flow         │   └─────────────────────┘   └──────────────────────┘
 └──────────▲───────────┘
            │ supabase/seed.sql (generated, committed)
 ┌──────────┴──────────────────────────────────────────────────────────────┐
 │ Python data pipeline: data.gov.hr CKAN API + OpenStreetMap + Nominatim   │
 │ fetch → transform (clean, join, dedupe) → geocode (cached) → load (SQL)  │
 └──────────────────────────────────────────────────────────────────────────┘
```

| Part | Technology | Why |
|---|---|---|
| App | Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4 | One repo for pages and API routes; instant Vercel deploys |
| Database | Supabase Postgres + PostGIS | Nearest-place search (KNN on a GIST index), transactions for booking, Realtime |
| Live updates | Supabase Realtime Broadcast + a 15 s poll as safety net | The patient's phone updates the moment the doctor acts |
| AI | Claude API (`claude-haiku-5-5`, set by `ANTHROPIC_MODEL`), streaming + tool use | Fast, cheap short turns; reads the uputnica image |
| Email | Resend + React Email | Doctor and patient emails, **only** to the team's demo inbox |
| Maps | MapLibre GL + OpenFreeMap tiles | Open source, no API key |
| Data | Python 3.12, pandas, rapidfuzz, Nominatim | Messy XLS/CSV from public portals, fuzzy matching, cached geocoding |
| Hosting | Vercel (app) · Supabase project in the EU (`eu-west-1`) | Free tier, zero ops |

---

## 2. Main flows

### 2.1 Golden path: patient → doctor → uputnica → appointment

```
Patient            /api/chat            Agent (Claude)        Database           Doctor portal
   │ message ──────► red-flag rules      │                     │                    │
   │                 (no hit)            │                     │                    │
   │                 └──── history ─────►│ one question        │                    │
   │ ◄──── streamed reply + quick replies│                     │                    │
   │   …3–6 turns, "Pošalji liječniku"…  │                     │                    │
   │                                     │ submit_case_summary │                    │
   │                 routing (code) ◄────┘                     │                    │
   │                 decides: chosen family doctor ───────────►│ case: sent_to_doctor
   │                 email with secure link (Resend → demo inbox) ───────────────────►│
   │                                                           │ ◄── opens link ────│ viewed_by_doctor
   │                                                           │ ◄── uploads uputnica (Claude reads it)
   │                                                           │ ◄── checks fields, Pošalji pacijentu
   │                                                           │ referral + earliest free slot held 15 min
   │ ◄──────────── Realtime ping → case page refetches ────────│                    │
   │ "Stigla je uputnica!" → Potvrdi termin → .ics, directions │ appointment confirmed
```

1. **Profile.** The patient picks a demo persona. Their chosen doctors are real
   doctors from HZZO open data (onboarding can search all of them by name or city).
2. **Intake** (`/api/chat`). Every message first goes through the
   **deterministic red-flag rules** (`lib/agent/redFlags.ts`). Only if none
   trigger does the agent see it. The agent asks one short question per turn and
   streams the answer token by token (Server-Sent Events).
3. **Readiness.** "Pošalji liječniku" unlocks when the patient has described
   enough (3 of 5 basics, or 3 messages): `lib/agent/readiness.ts`, deterministic.
4. **Summary.** The agent calls the `submit_case_summary` tool with a
   Zod-validated, doctor-ready summary (`lib/agent/schemas.ts`). The suggested
   specialty is labelled *prijedlog, ne dijagnoza*.
5. **Routing is code, not the model.** `lib/agent/routing.ts` maps the
   complaint category to the first point of contact (tooth → dentist,
   gynaecological → gynaecologist, child → paediatrician, everything else →
   family doctor).
6. **Doctor loop.** A secure link (random token, only its hash is stored,
   valid 72 h) goes by email to the demo inbox and is also shown in the app for
   the demo. The portal shows the summary, transcript and nearby hospitals for
   the suggested specialty.
7. **Uputnica.** The doctor uploads the uputnica they issued (PDF or image).
   Claude reads type, specialty, hospital, priority and note; the doctor checks
   and corrects the fields and sends. *In production this step is CEZIH (§5).*
8. **Booking.** `propose_appointment()` holds the earliest free slot at that
   hospital for 15 minutes in one SQL transaction. A unique index guarantees one
   live appointment per slot. If that hospital has no free slot in 3 weeks, the
   nearest other hospitals with the same specialty are tried
   (`propose_appointment_at()`), and the patient is told why.
9. **Live update.** Every status change is written as a `case_events` row and
   broadcast; the patient's case page refetches and animates the change.
10. **Confirm.** The patient confirms; they get an `.ics` calendar file,
    directions and a confirmation email.

### 2.2 Changes by notification, not phone calls

- **Earlier slot.** When a slot frees up (`/ustanova` → *Oslobodi raniji
  termin* simulates someone cancelling), `offer_freed_slot()` offers it to the
  patient with the latest later appointment for the same hospital and specialty,
  holding it for 15 minutes. *Prihvati* moves the appointment and offers the old
  slot onward; *Odbij* offers it to the next patient.
- **"Ne paše mi".** The patient marks the days and parts of the day that suit
  them; the hospital side sees the request with matching free slots and offers
  one; the patient accepts or declines.
- All of these run as single SQL functions with row locks, so two patients can
  never get the same slot.

### 2.3 Direct path (away from home)

If the patient is more than 25 km from home and the category allows direct
access (dental), the case is routed `direct`: no referral, no email. The
patient gets the nearest open practices in the city they are in now (KNN search
in PostGIS, open-now from opening hours). If nothing is open, each practice
shows when it opens next, plus the nearest emergency department (0–24) for
"can't wait".

### 2.4 Emergency path

A red-flag hit (chest pain with breathing trouble, stroke signs, heavy bleeding,
suicidal statements, unconsciousness, anaphylaxis, seizure, meningitis signs,
head injury with danger signs, poisoning, bleeding in pregnancy) stops the chat
**before the model is called**. The patient sees a full-screen 112 takeover with
the nearest emergency department (OHBP). The model's own `urgency: hitno` is a
second layer that escalates the same way.

---

## 3. Safety design

| Layer | Where | What it guarantees |
|---|---|---|
| Red-flag rules | `lib/agent/redFlags.ts` (Croatian + English) | Deterministic, runs on every message before the model; unit-tested with positive and negative cases |
| Model urgency | `submit_case_summary.urgency = "hitno"` | Second net for emergencies the rules don't name |
| System prompt | `lib/agent/prompt.ts` | Never diagnose, never recommend medication, one question at a time, 112 when in doubt |
| Deterministic routing | `lib/agent/routing.ts` | The model classifies; code decides who handles it |
| Doctor in the loop | Doctor portal | Only a doctor issues an uputnica; the AI never refers anyone |
| Always-visible 112 | `Always112Banner` on every patient page | Emergency number never more than one tap away |
| Abuse limits | `lib/rateLimit.ts`, `rate_limits` table | Chat 40 messages/hour per visitor, 20 per conversation, 800/day overall; uputnica reading 10/hour |
| Evals | `lib/agent/evals.ts`, `pnpm eval` | 17 scripted patients (incl. 2 English) check urgency **and** route against the running app |

---

## 4. Data model

Shaped after **HL7 FHIR** resources so integration with national systems is a
mapping, not a rewrite. Migrations in `supabase/migrations/` (numbered, in order).

| Table | FHIR analogue | Contents |
|---|---|---|
| `institutions` | Organization / Location | 5,128 hospitals, health centres and practices; PostGIS point; `source_dataset` on every row |
| `specialties`, `institution_services` | HealthcareService | 174 HZZO specialties and which institution offers which |
| `institution_hours` | Location.hoursOfOperation | Opening hours (OSM, 0–24 for OHBP, demo-filled where marked) |
| `practitioners` | Practitioner / PractitionerRole | 4,901 chosen doctors from HZZO (family, dentist, gynaecologist, paediatrician) |
| `patients`, `patient_practitioners` | Patient, CareTeam | 3 synthetic personas and their chosen doctors |
| `cases` | Encounter + QuestionnaireResponse | Status, route, urgency, structured summary, where the patient is now |
| `messages` | Communication | The chat transcript |
| `referrals` | ServiceRequest | Type, specialty, priority, hospital, note, uploaded document |
| `slots` | Slot | **Synthetic** 30-minute slots, 3 weeks ahead, at hospitals in the demo cities |
| `appointments` | Appointment | proposed → confirmed / reschedule_requested / cancelled |
| `notifications` | Communication | Earlier-slot and reschedule offers (Prihvati / Odbij) |
| `case_events` | AuditEvent | Every status change; drives the timeline and live updates |
| `doctor_tokens` | — | Hash of each doctor link, expiry, first use |
| `rate_limits` | — | Hashed visitor counters (no IP addresses stored) |

**Case status machine:** `intake → triaged → sent_to_doctor → viewed_by_doctor →
referral_issued → appointment_proposed → appointment_confirmed`, plus
`routed_direct`, `emergency_escalated`, `reschedule_requested`, `closed`.

Database functions (PL/pgSQL, server-only): `nearest_institutions`,
`open_status`, `propose_appointment`, `propose_appointment_at`,
`confirm_appointment`, `cancel_appointment`, `offer_freed_slot`,
`accept_slot_offer`, `decline_slot_offer`, `request_reschedule`,
`offer_reschedule`, `free_slot`, `release_expired_holds`,
`generate_demo_slots`, `patient_profile`, `institution_card`,
`search_practitioners`, `open_data_stats`, `demo_reset`, `hit_rate_limit`.

---

## 5. Security and privacy (prototype level)

- **Synthetic patients only.** No real health data in the repo, database, logs
  or video. Real doctor names come from public HZZO data; no message is ever
  sent to a real doctor. Every email goes to one team-controlled inbox.
- **Row Level Security** is on for every table. Open data is world-readable;
  patient-side tables have no public policies, so only server routes (service
  role, never shipped to the browser) can read or write them.
- **Ownership checks** on every patient API route: the demo identity cookie
  must own the case, appointment or notification.
- **Doctor links:** random token in the email; only a SHA-256 hash is stored;
  expires after 72 h. (CLAUDE.md asked for single-use links; we kept them
  reusable until expiry because doctors reload pages.)
- **Realtime carries no data,** only a "something changed" ping on the topic;
  the page then refetches through the authenticated API.
- **Secrets** live in `.env.local` / Vercel environment variables only;
  `app/.env.example` lists the names.
- **No PII in logs;** visitor counters store a one-way hash, not the IP.

---

## 6. Reliability

| Risk | Fallback |
|---|---|
| Model slow or down while recording | **Demo-safe mode** (`?demo=1`): if nothing streams within 8 s, the persona's prepared conversation continues; reading the sample uputnica falls back to its known contents. `UPUTKO_DEMO_OFFLINE=1` skips the model completely. |
| Model fails for a real user | Two automatic retries; then a friendly message with *Pokušaj ponovno* (the message is never saved twice) |
| Realtime connection drops | The case page polls every 15 s |
| Map tiles fail | The address is always written next to the map; maps load only when on screen |
| Routing service unavailable | We use straight-line distance only (no external routing dependency) |
| A dataset URL dies | The raw open-data snapshot is committed; the database rebuilds offline in one command |
| Two patients, one slot | SQL row locks + a unique index on live appointments |

Tested by: 138 unit tests (Vitest), Playwright end-to-end tests in Chromium and
Firefox (golden path, emergency, direct route, rescheduling, demo mode, edge
cases, axe accessibility in light/dark/large text), and the agent evals.

---

## 7. How it scales beyond the prototype

The app is **stateless**: every request can run on any server instance; all
state is in Postgres. Scaling steps, none of which need a redesign:

1. **Read load** (search, maps, open data): Postgres read replicas; open data
   changes rarely and can be cached at the edge.
2. **Chat load:** the agent is one short streamed request per message;
   Vercel/Node scales horizontally. Prompt caching keeps model costs down.
3. **Booking contention:** each booking is one short transaction with row
   locks on a single slot, which scales well. In production, slots are owned by
   the hospitals' systems (see §8) and Uputko only relays requests.
4. **Notifications:** move from in-app + email to Web Push and SMS through a
   queue, so slow providers never block a request.
5. **Data refresh:** the pipeline is idempotent and re-runnable; schedule it
   (e.g. nightly) against the live CKAN API instead of the committed snapshot.

---

## 8. Path to production (documented, not built)

```
Patient ─► Uputko ─► chosen primary-care doctor ─► CEZIH (e-uputnica)
                                                     │
                                                     ▼
Patient ◄── notifications ◄── hospital ◄── e-Naručivanje (booking)
```

| Prototype part | Becomes | Notes |
|---|---|---|
| Demo persona picker | **e-Građani / NIAS** login | National identity; the patient's chosen doctors would come from HZZO records instead of manual choice. TODO(verify): access conditions for a third-party service |
| Doctor portal + upload | Plugin or link in the doctor's **certified practice software**, which issues the e-uputnica in **CEZIH** | The summary maps to FHIR `QuestionnaireResponse` / `Encounter`; the referral to `ServiceRequest`. TODO(verify): which FHIR profiles and interfaces CEZIH exposes to third parties |
| Synthetic slots + `/ustanova` panel | **e-Naručivanje** and hospital information systems | Our `Slot` / `Appointment` model maps 1:1. Earlier-slot offers and "ne paše mi" become messages to the hospital's scheduling desk instead of phone calls, a saving for hospitals as well. TODO(verify): available e-Naručivanje interfaces |
| Email to demo inbox | Secure messaging inside CEZIH / practice software | No health data in ordinary email |
| In-app notifications | Web/native push + SMS fallback | SMS matters for older patients without smartphones |
| Open-data snapshot (2017–2018 HZZO files) | Live, regularly refreshed registries | Also needs machine-readable opening hours and on-call (*dežurstvo*) schedules, which are not published today |

---

## 9. Legal and organisational prerequisites

These must be resolved before real patients use the service. They are
assessments to make, not conclusions; a qualified lawyer and the regulators
have the final word.

- **GDPR, Article 9:** health data is a special category. It needs a lawful
  basis and explicit consent, a **Data Protection Impact Assessment**, EU-only
  processing, and data-processing agreements with the hosting and AI providers.
- **EU Medical Device Regulation (MDR):** software that triages patients may
  qualify as a medical device. A regulatory assessment is needed, likely
  followed by CE marking.
- **EU AI Act:** an AI system used for health triage is likely **high-risk**.
  That means risk management, human oversight (the doctor-in-the-loop design
  helps), logging and transparency obligations.
- **HZZO / Ministarstvo zdravstva:** an agreement to integrate, plus
  **CEZIH certification** for any component that touches e-uputnica or booking.
- **Clinical validation:** the red-flag rules and the routing table must be
  reviewed and validated by physicians before real use.
- **Accessibility:** public-sector-facing services must meet WCAG 2.1 AA (EU
  Web Accessibility Directive); the prototype already passes automated
  WCAG 2.2 AA checks on the patient pages.

---

## 10. Known limitations

- HZZO open data is from **2017–2018**; some doctors and hospitals have changed.
- Open data has **no opening hours or on-call schedules** for most practices;
  demo cities have hand-filled hours, marked `demo_hand_filled`.
- About 12% of locations are approximate (postcode level). They rank behind
  exact ones, and the address is always shown.
- Distances are straight-line, not travel time.
- Voice input uses the browser's Web Speech API; quality varies by browser.
- For dental pain outside opening hours the real fallback is the dental on-call
  service, which open data does not publish; we point to the nearest emergency
  department instead. TODO(verify) with a clinician.

See [`data-sources.md`](data-sources.md) for every dataset and how it is linked,
and [`codebase.md`](codebase.md) for a guide to the code.

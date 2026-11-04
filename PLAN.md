# PLAN.md — Uputko (working name)

**Datathon Portala otvorenih podataka 2026 · Challenge A: Društvo i javne usluge**
**Today: Wed 04.11.2026 · Submission: Mon 09.11.2026, 24:00 → open.data@mpudt.hr**
**Internal target: submit Mon 09.11 by 18:00.** Six hours of buffer for email size limits, a broken link or a re-render.

---

## 1. Executive Summary

### Core thesis
Getting a specialist appointment in Croatia means: book the family doctor, wait, go in (often just to ask for an uputnica), then work out which institution can actually see you. It is hardest for exactly the people with the least time and mobility — elderly patients, students studying away from their registered doctor, people travelling. Changing an appointment means more phone calls; one of us was called six times to confirm a different ultrasound slot. **Uputko collapses all of that into one conversation.** It acts as the middleman between the patient and the system. The patient describes the problem once. The agent gathers a structured history, catches emergencies and sends the right doctor a clean summary. When the doctor issues the referral, the agent books a slot at the right institution *near where they are now*. Later changes arrive as notifications the patient can accept or decline, not phone calls.

Open data is not decoration here — it is the routing engine: HZZO primary-care network and practitioner data identify the patient's doctor; health-institution registries and geodata decide where the patient goes.

### Demo strategy
Judging is **video + documentation only** (no live pitch), so the video *is* the product for the jury.
- **Hero moment:** a split screen — patient's phone on the left, doctor's laptop on the right. The doctor clicks *"Izdaj uputnicu"*. Within a second the patient's phone animates the referral card in, the map flies to the recommended hospital, and a proposed slot appears: *"Dođite u KB Dubrava, utorak 10.11. u 9:30"*. This single shot proves agent + integration + realtime + open data + UI.
- **Second moment, "boli me zub, u Varaždinu sam":** a student away from home gets the nearest open dental practice or on-call service in Varaždin, with opening hours and directions, in about 10 seconds. No referral or doctor email is needed. This shows routing to the right chosen doctor and location-aware open data.
- **Third moment, rescheduling without phone calls:** a slot frees up on the institution side → the patient's phone shows *"Oslobodio se raniji termin — želite li ga?"* → Prihvati → the calendar updates. Then *"Ne paše mi"* → the patient picks when they're free → a new slot is offered.
- **Fourth moment:** the emergency path — patient types "jako me boli u prsima i ne mogu disati", the whole screen switches to the 112 takeover with the nearest OHBP. Shows we take safety seriously.
- Deployed URL + test credentials in the README so judges can click through themselves.

### Scope (be ruthless)
| In | Out (mention as "future work") |
|---|---|
| Text chat + optional voice input | Native mobile apps |
| One synthetic patient profile per persona (3 personas), each with chosen obiteljski / stomatolog / ginekolog / pedijatar | Real auth, e-Građani/NIAS login |
| Routing to the right chosen doctor + direct "go here, open until…" path when away from home | Full symptom-checker coverage of all specialties |
| Doctor portal via email link | Inbound email reply parsing (stretch only) |
| Demo uputnica (types A1/A3, specialty, priority) | Real CEZIH e-uputnica |
| **Synthetic** appointment slots, booking, earlier-slot offers, "ne paše mi" reschedule, .ics + in-app/email notifications | Real hospital booking (e-Naručivanje / hospital systems), native push |
| Institutions + specialties for the whole country if data allows, at minimum Zagreb, Split, Rijeka, Osijek, Varaždin, Dubrovnik | Live waiting times |

---

## 2. Team Roles

| Person | Owns | Also |
|---|---|---|
| **A — Data & backend** | Pipeline, Supabase schema, geo queries, seed data, `data-sources.md` | Architecture doc |
| **B — Agent & flows** | System prompt, red-flag rules, tools, case state machine, email, doctor portal logic | Agent evals, Playwright E2E |
| **C — Frontend & design** | Design system, all screens, motion, map, accessibility | Video editing |

Daily: 15-min sync at 10:00 and 21:00. Main branch always deploys. Mentor review scheduled Sun 08.11 morning (send the deployed URL Saturday night).

---

## 3. Phased Development Roadmap

### Phase 0 — Kickoff (Wed 04.11 evening, ~2h)
- [ ] Repo, Next.js app, Tailwind + shadcn, Supabase project (EU region), Vercel deploy of "hello world"
- [ ] API keys: Claude, Resend (verify a sending domain or use the sandbox sender), Supabase
- [ ] Decide final name + accent colour (C)
- [ ] A starts browsing data.gov.hr and lists candidate datasets
- [ ] Everyone turns off model training on their data in Claude / ChatGPT / Codex settings
- [ ] Confirm with the mentor (and the *Pravila za Datathon*) that AI-assisted coding is allowed; we write the plan and architecture ourselves either way
**Exit:** blank app deployed on a public URL; everyone can run it locally.

### Phase 1 — Core Foundation & Data Layer (Thu 05.11)
**A — Data**
- [ ] Fetch via **CKAN Action API** (`/api/3/action/package_search`, `package_show`) and store raw files with metadata (URL, publisher, licence, fetch date). Candidate datasets to verify:
  - HZZO *Pokazatelji uspješnosti rada ordinacija primarne zdravstvene zaštite* (practitioners/practices)
  - HZZO *Mreža javne zdravstvene službe* (primary-care network by area)
  - *Lokacije ordinacija primarne zdravstvene zaštite* and *Adresar zdravstvenih ustanova / privatnih praksi* — `TODO(verify)` still published
  - Ministarstvo zdravstva *Zdravstvene ustanove* (XLS)
  - City portals, e.g. Grad Zagreb *Geoportal zdravstvene ustanove* (GeoJSON, already geocoded)
  - OpenStreetMap (`amenity=hospital|clinic|doctors`, `emergency=yes`) as geo backfill
- [ ] Transform: normalise names/addresses, map institution type, build **specialty ↔ institution** table (hand-curated for the major hospitals where data lacks departments — document this honestly)
- [ ] Geocode missing coordinates with Nominatim (1 req/s, cached, committed)
- [ ] Dedupe across sources with rapidfuzz (name + city); keep `source_dataset` on every row

**A/B — Schema**
- [ ] Migrations for the tables in CLAUDE.md §2.4, PostGIS, RLS, indexes
- [ ] SQL function `nearest_institutions(specialty, lat, lng, limit)` using KNN `<->`
- [ ] Opening hours + on-call (*dežurstvo*) info into `institution_hours` wherever a dataset has it; hand-fill for the demo cities where it doesn't, and mark it as such
- [ ] Seed 3 synthetic personas, each with chosen doctors: *Ana, 72, Zagreb* (ear pain → obiteljski → ORL) · *Luka, 21, student in Varaždin, doctors in Osijek* (toothache → direct route) · *Maja, 34, Split, with a sick child* (→ pedijatar)
- [ ] Generate synthetic `slots` for the next 3 weeks at demo institutions (realistic spread, a few gaps)

**C — Foundation UI**
- [ ] Tokens, light/dark themes, typography, large-text mode
- [ ] App shell, phone-frame layout, landing screen, empty chat screen

**Exit:** `nearest_institutions('kardiologija', 43.51, 16.44)` returns sensible results; seed loads from scratch in one command.

### Phase 2 — Feature Engineering & Business Logic (Fri 06.11)
**B — Agent**
- [ ] `/api/chat` streaming with Vercel AI SDK; Croatian system prompt; tools `getMyDoctor`, `findInstitutions`, `submitCaseSummary`
- [ ] Red-flag rules + tests; `EmergencyTakeover` trigger
- [ ] Structured summary (Zod) → `cases.summary_json`; status transitions write `case_events`
- [ ] Routing table (complaint → chosen doctor role) + direct path when away from home
- [ ] 15 scripted eval scenarios, including "boli me zub, u Varaždinu sam", "dijete ima temperaturu", "boli me uho dva dana", "bol u prsima"; tune the prompt until urgency **and** route are right on all of them

**B — Doctor loop**
- [ ] Email to doctor (React Email): patient, summary, urgency badge, current location, "Otvori slučaj" button with signed token
- [ ] Doctor portal `/lijecnik/slucaj/[token]`: summary, chat transcript (collapsible), suggested specialty, ranked institutions near the patient on a map, form to issue uputnica (type, specialty, priority, institution, note), or "Pozovite pacijenta na pregled" as an alternative outcome
- [ ] Issuing writes `referrals` + event → Realtime broadcast
- [ ] Patient confirmation email with referral details

**B — Appointments & changes**
- [ ] On referral issued: pick the earliest free slot at the chosen institution, hold it 15 min, notify the patient (`appointment_proposed`)
- [ ] Patient actions: **Potvrdi** / **Ne paše mi** (availability picker: days + morning/afternoon) / **Otkaži**
- [ ] Demo institution panel `/ustanova`: list bookings, **Oslobodi termin** (simulates a cancellation), answer reschedule requests with a new slot
- [ ] Freed slot → `earlier_slot_offer` to the patient with the latest later appointment → Prihvati / Odbij
- [ ] Atomic slot booking (one SQL transaction) + `.ics` generation + email/in-app notification for every change

**A — Geo & routing**
- [ ] Browser geolocation with manual city fallback; store on case
- [ ] Ranking: distance, institution type fits specialty, (optional) OSRM ETA with timeout → straight-line fallback

**C — Screens (functional, not yet pretty)**
- [ ] Chat (streaming bubbles, quick-reply chips, composer, voice button)
- [ ] Case page with timeline driven by `case_events`
- [ ] Referral card + institution map
- [ ] Onboarding: choose doctors from open data (search by name/city)
- [ ] Appointment card, notification center, action toasts

**Exit:** the full golden path works end-to-end on the deployed URL, ugly or not: chat → doctor → uputnica → slot confirmed. The toothache direct route also works. Rescheduling may slip to Saturday morning if needed. **This is the most important checkpoint in the plan.** If it slips, cut Phase 3 scope, not Phase 2.

### Phase 3 — Visual Identity & Interface Polish (Sat 07.11)
- [ ] Chat: message enter animations, typing indicator that feels alive, quick replies that morph into the answer, smooth autoscroll
- [ ] Case timeline: animated status steps (*Poslano liječniku → Pregledano → Uputnica izdana → Na putu*)
- [ ] **Referral arrival:** card slides in with a subtle confetti-free success pulse; map flies to the institution; "Upute" button opens native maps
- [ ] Appointment card: date/time big and clear, location, "otvoreno do 20:00" live badge, what to bring (uputnica no., ID, health card), Dodaj u kalendar
- [ ] Notifications: earlier-slot offer slides in as an actionable toast; accepting animates the old slot out and the new one in
- [ ] Persistent but calm "Hitno? Zovi 112" banner from the first screen
- [ ] Emergency takeover: full-screen, high-contrast, one giant "Nazovi 112" button, nearest OHBP card, nothing else competing for attention
- [ ] Doctor portal: dense but calm desktop layout, keyboard shortcuts, issue form under 3 clicks
- [ ] Data-provenance chips ("Izvor: HZZO, data.gov.hr") on institutions and doctor — earns rubric points visibly
- [ ] Optional "Javni podaci" page: small map + counts of institutions/doctors by county from our dataset (cheap, shows data linkage)
- [ ] Accessibility pass: axe DevTools clean, keyboard-only run, screen reader labels, large-text mode, contrast in both themes
- [ ] Lighthouse ≥ 90 performance and 100 accessibility on the patient pages

**Exit:** a stranger can complete the golden path on a phone without help and says "wow" at the referral moment. Send URL to mentor tonight.

### Phase 4 — Demo Integration & Edge-Case Handling (Sun 08.11 → Mon 09.11)
**Sunday**
- [ ] Mentor feedback → fix top 5 issues only
- [ ] Edge cases: LLM timeout (retry + friendly message), patient denies location, no institution for specialty nearby (widen radius, say so), nothing open right now (show next opening + on-call service), doctor opens expired link, no free slot in 3 weeks (offer a nearby institution), patient declines twice, two patients accept the same freed slot, empty/garbled input, user switches to English
- [ ] **Demo-safe mode:** `?demo=1` seeds a fresh case per persona and uses a cached agent transcript if the API is slow — so the recording never depends on luck
- [ ] Playwright golden path + emergency path green
- [ ] Record the video (script below), two takes minimum, screen at 1080p+
- [ ] Write `docs/architecture.md` (diagram, data flow, scaling path, CEZIH/FHIR integration path, legal prerequisites) and `docs/data-sources.md`

**Monday**
- [ ] Final README: problem, live URL, test credentials, how to run, how to rebuild data
- [ ] Freeze code at 15:00; tag `v1.0-datathon`
- [ ] Package: repo link (public GitHub) + zip, docs as PDF, video (link to unlisted YouTube/Drive plus file if size allows), short cover email listing team, mentor, challenge (A)
- [ ] Send by 18:00; one teammate confirms the email and all links open from a logged-out browser

### 3-minute video script (draft)
| Time | Content |
|---|---|
| 0:00–0:20 | The problem: going from doctor to doctor, a trip just for paper, guessing which hospital, six phone calls to move one ultrasound. |
| 0:20–0:30 | The solution in one sentence: "you describe it once, everything else happens in the background". Who it's for. |
| 0:30–1:20 | **Live demo, split screen:** Ana's chat → follow-up questions → summary sent → doctor's email → portal → *Izdaj uputnicu* → phone updates live → slot proposed → Potvrdi → map + calendar. |
| 1:20–1:40 | Rescheduling: slot freed at the institution → earlier-slot offer on the phone → Prihvati. |
| 1:40–1:55 | Luka in Varaždin: "boli me zub" → nearest open dentist, hours, directions. |
| 1:55–2:05 | Emergency path: chest pain → 112 takeover. |
| 2:05–2:30 | Open data used and how it's linked (sources on screen), architecture diagram. |
| 2:30–2:55 | Path to production: CEZIH e-uputnica, e-Naručivanje booking, e-Građani login, legal prerequisites. |
| 2:55–3:00 | Team, name, URL. |

---

## 4. Architecture (summary for docs/architecture.md)

```
 Patient (PWA, phone)          Doctor (browser, from email link)
        │  HTTPS / SSE stream               │
        ▼                                   ▼
 ┌──────────────────── Next.js on Vercel (EU) ────────────────────┐
 │ /api/chat ── Claude API (streaming, tools) ── red-flag rules   │
 │ /api/cases  /api/referrals  /api/email (Resend)               │
 └───────────────┬─────────────────────────────┬──────────────────┘
                 ▼                             ▼
     Supabase Postgres + PostGIS        Supabase Realtime ──► patient UI
     (practitioners, institutions,
      cases, referrals, events)
                 ▲
     Python ETL (CKAN API → clean → geocode → seed)
     data.gov.hr · HZZO · Ministarstvo zdravstva · city portals · OSM
```

**Reliability for a prototype:** stateless app on Vercel; all state in one managed Postgres with daily backups; open-data snapshot committed to git so the DB can be rebuilt from zero in one command; demo-safe mode for the recording.

**Path to production (documented, not built):**
- **CEZIH integration** — real e-uputnica is created in CEZIH by the doctor. Our summary maps to FHIR `QuestionnaireResponse`/`Encounter`; the referral maps to `ServiceRequest`, so the portal step can become a plugin in the doctor's certified practice software.
- **Identity** — e-Građani / NIAS for patients; doctors via their existing practice software.
- **Booking & changes** — replace synthetic slots with the existing e-Naručivanje flow and hospital information systems. Our appointment model maps to FHIR `Slot`/`Appointment`. Earlier-slot offers and "ne paše mi" requests become messages to the hospital's scheduling desk instead of phone calls. That is a direct cost saving for hospitals too (fits Challenge C arguments as a side benefit).
- **Notifications** — web/native push and SMS fallback for elderly users without smartphones.

Full flow in production: patient → Uputko → chosen PZZ doctor → CEZIH / e-uputnica → e-Naručivanje → hospital → notifications back to the patient.

**Technical, organisational and legal prerequisites** (the rubric asks for these explicitly):
- GDPR Art. 9 (health data as special category) — explicit consent, DPIA, EU-only processing, data processing agreements with the LLM and hosting providers
- EU **MDR** — software that triages patients may qualify as a medical device; needs a regulatory assessment and likely CE marking before real use
- EU **AI Act** — health-triage AI is likely high-risk; requires risk management, human oversight (our doctor-in-the-loop design helps), logging and transparency
- HZZO / Ministarstvo zdravstva agreement and CEZIH certification for integration
- Clinical validation of the triage rules with physicians

---

## 5. Risks, Bottlenecks & Trade-offs

| Risk | Impact | Mitigation |
|---|---|---|
| **Only 5 days** | Everything | Phase 2 golden path by Friday night is the gate; cut polish before cutting function. Daily scope check at 21:00 sync. |
| Open datasets are stale, inconsistent or lack departments/specialties | Weak routing, weak "data" score | Combine several sources; hand-curate specialty mapping for major hospitals and say so in `data-sources.md`; OSM backfill; commit snapshots |
| A dataset URL is dead on demo day | Broken pipeline | Pipeline reads from committed snapshot by default; live fetch is a separate command |
| Geocoding rate limits (Nominatim 1 req/s) | Slow pipeline | Run Thursday morning, cache results, prefer sources that already have coordinates |
| LLM misses an emergency | Safety + credibility | Deterministic red-flag rules run before and after the LLM; tested; agent always offers 112 when uncertain |
| LLM is slow or down while recording | Bad video | Streaming UI; demo-safe mode with cached transcript; record early Sunday, not Monday |
| Email lands in spam / Resend domain not verified | Doctor step fails | Verify domain Wednesday; send only to team inboxes; doctor portal link also shown in-app for the demo |
| Open data has no free slots, referrals or patient data | Booking looks fake | Synthetic slots, clearly labelled "demo"; show exactly which part becomes e-Naručivanje in production |
| Opening hours / on-call data missing for many practices | Weak "go here now" answer | Use any hours in the data; hand-fill demo cities; otherwise show phone + "provjerite radno vrijeme" |
| Rescheduling adds a lot of state | Phase 2 overruns | Golden path first; reschedule is the first thing to slip to Saturday morning, never into Sunday |
| Inbound email parsing is fragile | Time sink | Not on the critical path — doctor acts in the portal; email reply is a stretch goal |
| Judges question legality ("you can't issue an uputnica by email") | Lower architecture/relevance score | Say it first: prototype stands in for CEZIH; show the integration path and legal prerequisites |
| Over-designed UI, under-built features | Low Izvedivost (10 pts) | Phase 3 starts only after Phase 2 exit criteria are met |
| Croatian speech recognition quality varies by browser | Voice demo fails | Voice is optional; demo in text; show voice only if it works reliably in Chrome |
| Submission email too large / bounced | Disqualification risk | Links (GitHub, unlisted video) plus small attachments; send by 18:00 Monday; confirm receipt |

**Deliberate trade-offs**
- *Monolith over microservices:* faster to build, easier to deploy, easier for judges to read. Scaling story lives in the docs.
- *Portal over email-reply parsing:* less magical, far more reliable.
- *Curated specialty mapping over full automation:* honest and accurate beats automated and wrong.
- *Synthetic patients only:* no real data risk, at the cost of some realism — acceptable for a prototype.

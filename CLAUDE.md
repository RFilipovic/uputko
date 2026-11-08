# CLAUDE.md — Uputko

> AI health-navigation agent for Croatian citizens. Built for the **Datathon Portala otvorenih podataka 2026**, Challenge A (*Društvo i javne usluge*).
> **Hard deadline: submission by email to open.data@mpudt.hr by 09.11.2026 at 24:00.** Every decision in this repo is weighed against that date.

---

## 1. Project Overview & Principles

### 1.1 What we are building
The app is the **middleman between the patient and the healthcare system**. The patient describes what's wrong once. Everything else happens in the background: the email to the doctor, the uputnica, the appointment. The patient just gets "come to this hospital at this time". The agent guides patients through the system (who, where, when, for what). It never diagnoses.

0. **Profile** — on setup the patient picks their chosen doctors from open data: family doctor (*obiteljski*), dentist (*stomatolog*), gynaecologist (*ginekolog*) and, for children, paediatrician (*pedijatar*). A clear "Ako je hitno, zovi 112" message is shown from the first screen.
1. **Intake** — patient describes the problem in Croatian (text or voice). The agent asks focused follow-up questions: where it hurts, since when, fever, pain intensity 1–10, associated symptoms, history.
2. **Safety gate** — a rule-based red-flag check runs on every turn. Emergencies (chest pain + dyspnoea, stroke signs, heavy bleeding, suicidal ideation, etc.) immediately stop the flow and show **112** plus the nearest emergency department (OHBP) on a map.
3. **Routing to the right doctor** — the agent decides who handles it first:
   - tooth → chosen dentist; gynaecological → chosen gynaecologist; sick child → paediatrician; everything else (e.g. ear pain for 2 days) → family doctor for triage, who may refer to a specialist (e.g. ORL).
   - **Away from home** ("boli me zub, u Varaždinu sam, što da radim?") → nearest suitable practice or on-call service (*dežurna služba*) **in the patient's current city**, with address, opening hours and phone. No referral is needed for this path; the answer is "go here, it's open until 20:00".
4. **Case summary** — cases that need a doctor produce a structured, doctor-ready summary (never a diagnosis).
5. **Doctor loop** — the summary is emailed to the right chosen doctor, with a secure link to a lightweight doctor portal.
6. **Uputnica** — the doctor decides and issues a (demo) referral: type (A1/A2/A3…), specialty, priority, and a recommended institution. In reality this happens in CEZIH (see §1.3).
7. **Appointment** — the system proposes a slot at the recommended institution, **near where the patient is right now** (travelling, studying in another city). The patient confirms. They get the location, opening hours, what to bring, an "add to calendar" (.ics) file and a notification.
8. **Changes by notification, not phone calls**:
   - *Earlier slot freed up* → patient gets "Oslobodio se termin u utorak u 9:00 — želite li ranije?" → Prihvati / Odbij.
   - *Slot doesn't suit the patient* → "Ne paše mi" → pick times they're free → the institution side gets a reschedule request and offers a new slot.
   - Cancellation frees the slot for the next patient on the list.

Open data from data.gov.hr (doctors, primary-care network, health institutions, locations, opening hours where available) powers doctor selection, institution lookup and location-aware routing. Open data has **no** patient data, referrals or free appointment slots; those are simulated in the prototype (see PLAN.md §5).

### 1.2 Why it scores (rubric, 60 pts)
| Criterion | Pts | How we earn it |
|---|---|---|
| Upotreba otvorenih podataka | 5 | Pull datasets via the **data.gov.hr CKAN API**, not only manual downloads; show provenance in UI |
| Povezivanje podataka | 5 | Join HZZO doctor/network data + institution registries + geodata (OSM) into one location-aware graph |
| Relevantnost | 5 | Direct hit on "dostupnost javnih usluga", "lokacijski utemeljene usluge", "starije osobe" |
| Utjecaj | 5 | Elderly, students, tourists/travellers, rural residents; fewer unnecessary ER visits |
| Inovativnost | 5 | LLM agent with tool use + deterministic safety layer |
| **Izvedivost** | **10** | A working, deployed, clickable prototype — not slides |
| Arhitektura | 5 | Clear diagram, FHIR-shaped data model, documented CEZIH integration path, legal prerequisites listed |
| **Dojam (UI/UX)** | **10** | Polished, accessible, Croatian, works for a 75-year-old |
| **Prezentacija** | **10** | 3-minute video built around a live split-screen demo |

**30 of 60 points are Izvedivost + Dojam + Prezentacija.** A working, beautiful, narrow product beats a broad, broken one.

### 1.3 Non-negotiables
- **It works end-to-end in the deployed URL.** Every screen shown in the video exists and functions.
- **Safety first, visibly.** Red-flag escalation is deterministic code, not LLM judgment. The agent never diagnoses, never recommends medication, and always shows a disclaimer.
- **Synthetic patients only.** No real health data anywhere — repo, DB, logs, video. Doctor names from open data may be displayed; demo emails go only to team-controlled inboxes.
- **Croatian first.** All UI copy in Croatian; English fallback is optional.
- **Accessible.** WCAG 2.2 AA contrast, ≥ 18px base text option, full keyboard nav, large tap targets (≥ 48px; the phone chat screen uses ≥ 44px so the conversation stays visible), voice input. "Can my grandmother use it?" is a real test.
- **Perceived latency ≈ 0.** Stream every LLM response token by token, optimistic UI everywhere, skeletons instead of spinners, no layout shift.
- **Honesty about the real system.** In reality the e-uputnica is issued in **CEZIH**. Our doctor portal is a stand-in; docs must say so and describe the real integration path.

### 1.4 Tech stack & rationale
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript (strict)** | One repo, server routes + UI, instant Vercel deploys |
| Styling | **Tailwind CSS v4 + shadcn/ui** | Fast, consistent, accessible primitives we own |
| Motion | **Motion (Framer Motion)** | Fluid chat, state transitions, the live "uputnica arrives" moment |
| Client state | **Zustand** (chat/session), **TanStack Query** (server data) | Small, predictable |
| AI | **Vercel AI SDK + Claude API** (streaming, tool use, structured output via Zod) | Tool calls for `findDoctor`, `findInstitutions`, `submitCase` |
| DB | **Supabase Postgres + PostGIS** (EU/Frankfurt region) | Geo queries (`ST_DWithin`, KNN), Realtime channels, auth — one service |
| Realtime | **Supabase Realtime** | Patient screen updates the instant the doctor issues the uputnica |
| Email | **Resend** (outbound) + React Email templates | Reliable, pretty emails in minutes; inbound reply parsing is a stretch goal |
| Maps | **MapLibre GL JS + OpenFreeMap tiles** | Open source, free, good-looking, no API key drama |
| Routing ETA | **OSRM public demo** or straight-line fallback | Optional; never block on it |
| Data pipeline | **Python 3.12 + pandas + rapidfuzz + geopy (Nominatim)** | Messy XLS/CSV from public portals; fuzzy matching; cached geocoding |
| Voice | **Web Speech API** (hr-HR) | Zero-cost voice input for elderly users; graceful fallback to text |
| Hosting | **Vercel** (app) + **Supabase** (data) | Free tier, EU region, zero ops |

We deliberately do **not** use: microservices, Kubernetes, a separate API gateway, a vector DB, or a custom auth server. They add risk and no points in 5 days. The architecture document explains how the design scales beyond the prototype.

---

## 2. Technical Standards & Conventions

### 2.1 Repository layout
```
/
├── CLAUDE.md
├── PLAN.md
├── README.md                    # setup + demo URL + credentials for judges
├── scripts/create-issues.mjs    # one-off: GitHub milestones + issues from PLAN.md (see §3.1)
├── docs/
│   ├── architecture.md          # diagrams, data flow, CEZIH path, legal prerequisites
│   ├── data-sources.md          # every dataset: URL, publisher, licence, fetch date, transform
│   └── demo-script.md           # the 3-minute video script
├── data-pipeline/               # Python ETL
│   ├── fetch.py                 # CKAN API → data/raw/
│   ├── transform.py             # clean, normalise, dedupe, specialty mapping
│   ├── geocode.py               # Nominatim, cached in data/cache/geocode.json
│   ├── load.py                  # → supabase/seed.sql
│   └── data/{raw,clean,cache}/  # raw + clean snapshots are COMMITTED
├── supabase/
│   ├── migrations/              # SQL migrations, numbered
│   └── seed.sql                 # generated, committed
└── app/                         # Next.js
    ├── src/app/
    │   ├── (patient)/           # /, /chat, /slucaj/[id], /profil
    │   ├── (doctor)/lijecnik/   # /lijecnik/slucaj/[token]
    │   ├── (institution)/ustanova/ # demo-only panel: free a slot, answer reschedule requests
    │   └── api/                 # chat, cases, referrals, appointments, notifications, webhooks
    ├── src/components/
    │   ├── ui/                  # shadcn primitives (do not edit casually)
    │   ├── chat/                # MessageBubble, Composer, VoiceButton, QuickReplies
    │   ├── case/                # CaseTimeline, StatusPill, ReferralCard
    │   ├── map/                 # InstitutionMap, InstitutionList, OpeningHours
    │   ├── appointment/         # AppointmentCard, SlotPicker, AvailabilityPicker, AddToCalendar
    │   ├── notifications/       # NotificationCenter, ActionToast (Prihvati / Odbij)
    │   ├── onboarding/          # ChooseDoctors (obiteljski, stomatolog, ginekolog, pedijatar)
    │   └── emergency/           # EmergencyTakeover, Always112Banner
    ├── src/lib/
    │   ├── agent/               # system prompt, tools, red-flag rules
    │   ├── db/                  # typed Supabase client + queries
    │   ├── geo/                 # distance, ranking
    │   └── email/               # React Email templates + send
    ├── src/stores/              # Zustand
    └── src/i18n/hr.ts           # all UI strings
```

### 2.2 Code style
- TypeScript `strict: true`. No `any` without a `// reason:` comment.
- ESLint (next/core-web-vitals) + Prettier; run on commit via lint-staged.
- Components: function components, named exports, one component per file, `PascalCase.tsx`. Hooks `useThing.ts`. Utilities `camelCase.ts`.
- Server-first: fetch data in Server Components; mark `"use client"` only where interaction needs it.
- All external input (LLM tool args, API bodies, webhook payloads, CSV rows) is validated with **Zod**.
- UI strings live in `src/i18n/hr.ts`, never inline.
- Python: `ruff` + type hints; each pipeline step is idempotent and re-runnable.

### 2.3 Design system
- **Tokens** in `globals.css` as CSS variables (`--background`, `--primary`, `--urgent`, `--success`, radii, shadows); light theme only (dark mode was removed on purpose; do not add it back).
- **Palette:** cool blue-white `#EEF3FC` (background), ink `#0A1633` (text), **Deep Blue `#0028AB`** (primary actions), **Sky Blue `#4A89FF`** (accents, e.g. the mic button — always dark ink text on sky blue, never white). A reserved **urgent red** is used *only* for emergencies so it never loses meaning. The deep blue → white gradient (even split) is for the logo tile and small decorative marks, never behind body text. Logo (`BrandMark`): white compass on the gradient tile.
- **Style: minimalist and inclusive.** Must work for a 75-year-old: one column, one main action per screen, plain short Croatian sentences, bold sentence-case headings (no thin or all-caps display type), big solid buttons (≥ 56–64px tall), solid colours behind text, no decorative clutter or mock-ups. The landing page (`app/src/app/page.tsx`) is the reference.
- **Type:** Inter with `font-feature-settings: "ss01"`; Croatian diacritics checked (č ć đ š ž). Base text is 18px; the "Veća slova" toggle (`TextSizeToggle`) scales the root to 21px — layouts must not break at that size.
- **Motion:** 150–250 ms, ease-out; respect `prefers-reduced-motion`. Motion explains state change — it never decorates for its own sake.
- **States:** every async component has designed loading (skeleton), empty, error and success states. No raw spinners, no blank screens.
- **Mobile-first patient app** (the demo phone frame is 390×844); doctor portal is desktop-first.

### 2.4 Data model (core tables)
Shaped loosely after **HL7 FHIR** resources so the integration story is credible.

| Table | FHIR analogue | Key fields |
|---|---|---|
| `practitioners` | Practitioner | id, full_name, specialty, team_code, source_dataset |
| `institutions` | Organization/Location | id, name, type (DZ, OB, KB, KBC, poliklinika, OHBP), address, city, county, `geom geography(Point)`, phone, email, web, source_dataset |
| `institution_services` | HealthcareService | institution_id, specialty_code |
| `institution_hours` | Location.hoursOfOperation | institution_id, weekday, opens, closes, is_on_call (*dežurstvo*) |
| `patients` | Patient (synthetic) | id, name, birth_year, home_city, email |
| `patient_practitioners` | CareTeam | patient_id, role (`obiteljski`, `stomatolog`, `ginekolog`, `pedijatar`), practitioner_id |
| `cases` | Encounter + QuestionnaireResponse | id, patient_id, route (`direct`, `via_doctor`, `emergency`), target_role, status, urgency, summary_json, patient_location `geography`, created_at |
| `messages` | Communication | case_id, role, content, created_at |
| `referrals` | ServiceRequest | id, case_id, type (A1…), specialty_code, priority, institution_id, note, issued_at |
| `slots` | Slot (**synthetic**) | id, institution_id, specialty_code, starts_at, ends_at, status (`free`, `held`, `booked`) |
| `appointments` | Appointment | id, referral_id, slot_id, status (`proposed`, `confirmed`, `reschedule_requested`, `cancelled`), patient_availability_json |
| `notifications` | Communication | patient_id, kind (`referral_issued`, `appointment_proposed`, `earlier_slot_offer`, `reschedule_offer`, `reminder`), payload, action_state, read_at |
| `case_events` | AuditEvent | case_id, kind, payload, at — drives the timeline UI |

Case status machine: `intake → triaged → sent_to_doctor → viewed_by_doctor → referral_issued → appointment_proposed → appointment_confirmed → done` (plus `routed_direct` for the no-referral path, `emergency_escalated`, `reschedule_requested`, `closed`). Status changes are written as `case_events`; Realtime pushes them and `notifications` to the patient.

Slot rules: holding a slot for a proposal lasts 15 min; declining or cancelling sets it back to `free` and triggers an `earlier_slot_offer` to the next patient with a later appointment for the same specialty and institution. Wrap this in one SQL transaction so two patients can't get the same slot.

Indexes: GIST on `institutions.geom`; btree on `institution_services.specialty_code`; `(institution_id, specialty_code, starts_at)` on `slots`; `cases.patient_id`.

### 2.5 Agent design
- **System prompt** (in `lib/agent/prompt.ts`): Croatian, warm, short questions, one question at a time, max ~6 follow-ups, never diagnose, never prescribe, always offer 112 if in doubt.
- **Red-flag layer** (`lib/agent/redFlags.ts`): keyword + pattern rules evaluated on every user message *before* the LLM sees it, and on the LLM's structured `urgency` output after. Either one can trigger `EmergencyTakeover`. Unit-tested.
- **Routing table** (`lib/agent/routing.ts`): a small deterministic map from complaint category → first point of contact (`zub → stomatolog`, `ginekološko → ginekolog`, `dijete → pedijatar`, `ostalo → obiteljski`). The LLM classifies the category; code picks the doctor. If the patient is away from their home city and the category allows direct access (dental, on-call), route `direct` to the nearest open practice instead of emailing the home doctor.
- **Tools:** `getMyDoctors({role})`, `findInstitutions({specialty, near, openNow})`, `submitCaseSummary({...})`, `proposeAppointment({referralId})`, `requestReschedule({appointmentId, availability})`. Tool args validated with Zod.
- **Summary schema:** chief complaint, onset, duration, fever (y/n, °C), severity (1–10), body location, associated symptoms, relevant history, patient's current location, target role, agent's suggested specialty (labelled *"prijedlog, ne dijagnoza"*), urgency (`hitno` / `uskoro` / `rutinski`).

### 2.6 Testing standards
- **Vitest:** red-flag rules (every rule has a positive and negative test), geo ranking, Zod schemas, pipeline transforms (pytest).
- **Playwright:** one golden-path E2E (patient chat → doctor issues referral → patient sees route) and one emergency path. These two must pass before any demo recording.
- **Agent evals:** a small file of ~15 scripted patient scenarios (`lib/agent/evals.ts`) checking urgency classification; run manually before recording.
- No coverage targets — test what would embarrass us in the video.

### 2.7 Security & privacy (prototype level)
- Secrets only in `.env.local` / Vercel env; `.env.example` committed.
- Supabase Row Level Security on `cases`, `messages`, `referrals`.
- Doctor portal access via single-use, expiring signed token in the email link.
- No PII in logs; LLM requests carry synthetic data only.
- Every team member turns off "use my data for training" in the AI tools they use (Claude, ChatGPT, Codex) before pasting project material.
- Slots, appointments and notifications are **synthetic** and labelled as such in the UI's demo badge and in the docs.

---

## 3. Execution Instructions for AI Assistants

1. **Read `PLAN.md` first, then check the GitHub Issues** (see §3.1). Work on the current phase only. If a request falls outside it, say so before doing it.
2. **Deadline mode.** Prefer the simplest thing that works and looks good. Do not introduce new dependencies, services or abstractions without stating why the existing stack can't do it.
3. **Small, verifiable steps.** Make one change, run `pnpm typecheck && pnpm lint && pnpm test` (or the relevant pytest), and report the result. Never claim something works without running it.
4. **Respect the structure** in §2.1. New components go in the matching folder; new strings go in `hr.ts`.
5. **Every UI component ships with its loading, empty and error states**, keyboard support and reduced-motion handling. If you skip one, say which.
6. **Never weaken the safety layer.** Changes to `redFlags.ts` or the system prompt require updating tests and stating the behavioural change.
7. **Never fabricate data sources.** If a dataset URL, column or licence is unknown, mark it `TODO(verify)` — `docs/data-sources.md` must be accurate because judges score it.
8. **No real health data, no real patient emails.** Use the seeded synthetic personas.
9. **Commits:** Conventional Commits (`feat:`, `fix:`, `data:`, `docs:`, `style:`). One logical change per commit.
10. **When unsure about Croatian healthcare rules** (uputnica types, CEZIH, HZZO), say so and flag it for a human to verify rather than inventing specifics.
11. **Demo reliability over cleverness.** Anything on the demo path needs a fallback: cached LLM response for the scripted scenario, local snapshot of open data, straight-line distance if routing fails.

### 3.1 Progress protocol
Teammates work on separate laptops and must be able to continue each other's work from GitHub alone. **GitHub Issues are the shared state; `PLAN.md` describes the plan but does not track progress.** Every session that changes the project follows these steps. They need the `gh` CLI, logged in with the person's own account. If `gh` is missing or not logged in, stop and tell the person; do not work around it.

| State | On GitHub |
|---|---|
| To-do | Open, no assignee |
| In progress | Open, assignee + `in-progress` label |
| Finished | Closed |

Each phase is a milestone, and the **current phase is the lowest-numbered milestone with open issues**. New tasks found during the work become new issues in the right milestone.

**When the session starts**
1. Run `git fetch origin` and bring your branch up to date with `main`.
2. Read the state: `gh issue list --state open --limit 200 --json number,title,milestone,assignees,labels`. For context, read recently closed issues and their last comments: `gh issue list --state closed --limit 20` and `gh issue view <n> --comments`.
3. Tell the person the current phase, what is taken, and what is free to pick up.

**Before starting a task**
4. Do not start a task that has an assignee. A claim counts as abandoned only if the issue and its branch have had no activity for 12 hours; then you may take it over and say so in a comment.
5. Claim it: `gh issue edit <n> --add-assignee @me --add-label in-progress`. Then check with `gh issue view <n> --json assignees`. If someone else is also assigned, remove yourself and pick another task.

**When a task is finished**
6. Run the checks from rule 3 above, or the relevant pytest. Do not close an issue if they fail.
7. Put `Closes #<n>` in the commit message or PR, then get the work onto `main`. Work counts as done only once it is on `main`; GitHub closes the issue at that point. Before that, leave a handoff comment on the issue. Remove the `in-progress` label when the issue closes.
8. Close an issue only if everything in it is done and verified. If part of it is done, leave it open and describe the state in a comment.
9. Tasks done outside the repo (API keys, Supabase project, Vercel deploy) are closed with `gh issue close <n> --comment "..."`, without any secret values.

**When a whole phase is finished**
10. When the only open issue left in a milestone is `[P<n>] Exit criteria`, check those criteria for real and close it with a comment saying how you checked. A phase without that issue is finished when its milestone has no open issues.

**When a session stops before the task is finished**
11. Push the branch, keep the assignee and label, and leave a handoff comment saying what works, what does not, and where to continue.

**Handoff comment format**
```
**Done:** what now exists, with commit or branch.
**Not verified:** what was not run or checked.
**Open:** what is left, and any known problems.
**Next:** the most useful next step.
```

**Rules**
- Write only what you did and ran. "Not verified" is a valid answer; a wrongly closed issue costs a teammate more than an open one.
- Changes the next person needs in order to run the project go in the repo, not in comments: env var names in `app/.env.example`, commands in `README.md`.
- Issues and comments follow the same rules as the repo: no secrets, no real health data.
- Updating issues and pushing finished work to `main` is part of this protocol, so the person does not need to ask for it separately. If the person says not to push, respect that and tell them the team will not see the change.

Issues are created once from `PLAN.md` with `node scripts/create-issues.mjs` (add `--dry-run` to preview); after that, edit the issues directly.

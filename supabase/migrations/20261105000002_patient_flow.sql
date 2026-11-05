-- Patient flow. ALL rows here are synthetic (demo personas only).

create table public.patients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  birth_year    smallint not null,
  home_city     text not null,
  home_geom     extensions.geography(Point, 4326),
  email         text,              -- team-controlled demo inboxes only
  note          text,              -- persona description for the demo
  is_synthetic  boolean not null default true check (is_synthetic)
);
comment on table public.patients is 'FHIR Patient. Synthetic personas only — never real people.';

create table public.patient_practitioners (
  patient_id       uuid not null references public.patients (id) on delete cascade,
  role             text not null check (role in ('obiteljski', 'stomatolog', 'ginekolog', 'pedijatar')),
  practitioner_id  text not null references public.practitioners (id),
  primary key (patient_id, role)
);
comment on table public.patient_practitioners is 'FHIR CareTeam: the patient''s chosen doctors.';

create table public.cases (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references public.patients (id) on delete cascade,
  route             text check (route in ('direct', 'via_doctor', 'emergency')),
  target_role       text check (target_role in ('obiteljski', 'stomatolog', 'ginekolog', 'pedijatar')),
  status            text not null default 'intake' check (status in (
                      'intake', 'triaged', 'sent_to_doctor', 'viewed_by_doctor',
                      'referral_issued', 'appointment_proposed', 'appointment_confirmed', 'done',
                      'routed_direct', 'emergency_escalated', 'reschedule_requested', 'closed')),
  urgency           text check (urgency in ('hitno', 'uskoro', 'rutinski')),
  summary_json      jsonb,
  patient_location  extensions.geography(Point, 4326),
  patient_city      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
comment on table public.cases is 'FHIR Encounter + QuestionnaireResponse.';
create index cases_patient_idx on public.cases (patient_id);

create table public.messages (
  id          bigint generated always as identity primary key,
  case_id     uuid not null references public.cases (id) on delete cascade,
  role        text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index messages_case_idx on public.messages (case_id, created_at);

create table public.referrals (
  id               uuid primary key default gen_random_uuid(),
  case_id          uuid not null references public.cases (id) on delete cascade,
  -- TODO(verify): full list of uputnica types and priority labels with a physician / HZZO rules.
  type             text not null check (type ~ '^[A-D][0-9]$'),
  specialty_code   text not null references public.specialties (code),
  priority         text not null default 'redovna' check (priority in ('redovna', 'prioritetna', 'hitna')),
  institution_id   text references public.institutions (id),
  practitioner_id  text references public.practitioners (id),
  note             text,
  issued_at        timestamptz not null default now()
);
comment on table public.referrals is 'FHIR ServiceRequest. Demo stand-in for the CEZIH e-uputnica.';
create index referrals_case_idx on public.referrals (case_id);

create table public.slots (
  id              uuid primary key default gen_random_uuid(),
  institution_id  text not null references public.institutions (id) on delete cascade,
  specialty_code  text not null references public.specialties (code),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          text not null default 'free' check (status in ('free', 'held', 'booked')),
  held_until      timestamptz,
  check (ends_at > starts_at)
);
comment on table public.slots is 'FHIR Slot. SYNTHETIC — open data has no appointment availability.';
create index slots_lookup_idx on public.slots (institution_id, specialty_code, starts_at);
create index slots_free_idx on public.slots (specialty_code, starts_at) where status = 'free';

create table public.appointments (
  id                         uuid primary key default gen_random_uuid(),
  referral_id                uuid not null references public.referrals (id) on delete cascade,
  slot_id                    uuid not null references public.slots (id),
  patient_id                 uuid not null references public.patients (id) on delete cascade,
  status                     text not null default 'proposed' check (status in (
                               'proposed', 'confirmed', 'reschedule_requested', 'cancelled')),
  patient_availability_json  jsonb,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
comment on table public.appointments is 'FHIR Appointment (synthetic).';
-- One live appointment per slot: two patients can never hold the same slot.
create unique index appointments_live_slot_idx on public.appointments (slot_id)
  where status <> 'cancelled';
create index appointments_patient_idx on public.appointments (patient_id);

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients (id) on delete cascade,
  case_id       uuid references public.cases (id) on delete cascade,
  kind          text not null check (kind in (
                  'referral_issued', 'appointment_proposed', 'earlier_slot_offer',
                  'reschedule_offer', 'reminder')),
  payload       jsonb not null default '{}',
  action_state  text not null default 'none' check (action_state in (
                  'none', 'pending', 'accepted', 'declined', 'expired')),
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
comment on table public.notifications is 'FHIR Communication.';
create index notifications_patient_idx on public.notifications (patient_id, created_at desc);

create table public.case_events (
  id       bigint generated always as identity primary key,
  case_id  uuid not null references public.cases (id) on delete cascade,
  kind     text not null,
  payload  jsonb not null default '{}',
  at       timestamptz not null default now()
);
comment on table public.case_events is 'FHIR AuditEvent. Drives the case timeline UI.';
create index case_events_case_idx on public.case_events (case_id, at);

-- Keep updated_at fresh.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger cases_touch before update on public.cases
  for each row execute function public.touch_updated_at();
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();

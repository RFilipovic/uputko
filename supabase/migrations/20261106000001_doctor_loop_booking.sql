-- Phase 2: doctor access, uploaded uputnica, abuse limits, atomic booking.

-- ---------------------------------------------------------------- doctor links
-- The email link carries a random token; only its SHA-256 hash is stored.
create table public.doctor_tokens (
  token_hash       text primary key,
  case_id          uuid not null references public.cases (id) on delete cascade,
  practitioner_id  text references public.practitioners (id),
  expires_at       timestamptz not null,
  first_used_at    timestamptz,
  created_at       timestamptz not null default now()
);
create index doctor_tokens_case_idx on public.doctor_tokens (case_id);
alter table public.doctor_tokens enable row level security;

-- ---------------------------------------------------------------- uputnica upload
-- The doctor uploads the uputnica (stand-in for CEZIH); the model reads the
-- fields we need for booking. Demo documents are synthetic samples only.
alter table public.referrals
  add column document        bytea,
  add column document_mime   text,
  add column document_name   text,
  add column extracted_json  jsonb;

-- ---------------------------------------------------------------- rate limits
create table public.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  hits          integer not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;

-- Counts one hit; returns true while the key is within its limit.
create or replace function public.hit_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into n;
  if random() < 0.01 then
    delete from rate_limits where window_start < now() - interval '2 days';
  end if;
  return n <= p_max;
end $$;

-- ---------------------------------------------------------------- booking
-- All slot changes go through these functions. Each runs in one transaction
-- and locks the rows it touches, so two patients can never get the same slot.

create or replace function public.release_expired_holds()
returns integer
language sql
set search_path = public
as $$
  with freed as (
    update slots s set status = 'free', held_until = null
    where s.status = 'held' and s.held_until < now()
      and not exists (
        select 1 from appointments a
        where a.slot_id = s.id and a.status in ('confirmed', 'reschedule_requested'))
    returning 1)
  select count(*)::integer from freed
$$;

-- Hold the earliest free slot (at least 2 h ahead) for a referral, 15 min.
create or replace function public.propose_appointment(p_referral_id uuid)
returns public.appointments
language plpgsql
set search_path = public
as $$
declare
  r record;
  v_slot slots;
  v_appt appointments;
begin
  select ref.*, c.patient_id into r
  from referrals ref join cases c on c.id = ref.case_id
  where ref.id = p_referral_id;
  if not found then raise exception 'referral_not_found'; end if;

  perform release_expired_holds();

  select * into v_slot from slots
  where institution_id = r.institution_id and specialty_code = r.specialty_code
    and status = 'free' and starts_at > now() + interval '2 hours'
  order by starts_at
  limit 1
  for update skip locked;
  if not found then return null; end if;

  update slots set status = 'held', held_until = now() + interval '15 minutes'
  where id = v_slot.id;

  insert into appointments (referral_id, slot_id, patient_id, status)
  values (p_referral_id, v_slot.id, r.patient_id, 'proposed')
  returning * into v_appt;
  return v_appt;
end $$;

create or replace function public.confirm_appointment(p_appointment_id uuid)
returns public.appointments
language plpgsql
set search_path = public
as $$
declare
  v_appt appointments;
  v_slot slots;
begin
  select * into v_appt from appointments where id = p_appointment_id for update;
  if not found then raise exception 'appointment_not_found'; end if;
  if v_appt.status = 'confirmed' then return v_appt; end if;
  if v_appt.status <> 'proposed' then raise exception 'appointment_not_proposed'; end if;

  select * into v_slot from slots where id = v_appt.slot_id for update;
  if v_slot.status = 'booked' then raise exception 'slot_taken'; end if;

  update slots set status = 'booked', held_until = null where id = v_slot.id;
  update appointments set status = 'confirmed' where id = p_appointment_id
  returning * into v_appt;
  return v_appt;
end $$;

-- Offer a freed slot to the patient with the latest later appointment for the
-- same institution + specialty (skipping anyone who already declined it).
-- Holds the slot for them for 15 min. Returns the notification id or null.
create or replace function public.offer_freed_slot(p_slot_id uuid, p_exclude_appointment uuid default null)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_slot slots;
  v_target record;
  v_inst institutions;
  v_notification uuid;
begin
  select * into v_slot from slots where id = p_slot_id for update;
  if not found or v_slot.status = 'booked' or v_slot.starts_at < now() + interval '2 hours' then
    return null;
  end if;

  select a.id as appointment_id, a.patient_id, ref.case_id, s.starts_at as old_starts_at
  into v_target
  from appointments a
  join slots s on s.id = a.slot_id
  join referrals ref on ref.id = a.referral_id
  where a.status = 'confirmed'
    and a.id is distinct from p_exclude_appointment
    and s.institution_id = v_slot.institution_id
    and s.specialty_code = v_slot.specialty_code
    and s.starts_at > v_slot.starts_at
    and not exists (
      select 1 from notifications n
      where n.kind = 'earlier_slot_offer'
        and n.payload ->> 'slot_id' = p_slot_id::text
        and n.payload ->> 'appointment_id' = a.id::text)
  order by s.starts_at desc
  limit 1
  for update of a;

  if not found then
    update slots set status = 'free', held_until = null where id = p_slot_id;
    return null;
  end if;

  update slots set status = 'held', held_until = now() + interval '15 minutes'
  where id = p_slot_id;
  select * into v_inst from institutions where id = v_slot.institution_id;

  insert into notifications (patient_id, case_id, kind, payload, action_state)
  values (v_target.patient_id, v_target.case_id, 'earlier_slot_offer',
          jsonb_build_object(
            'appointment_id', v_target.appointment_id,
            'slot_id', p_slot_id,
            'starts_at', v_slot.starts_at,
            'old_starts_at', v_target.old_starts_at,
            'institution_name', v_inst.name),
          'pending')
  returning id into v_notification;
  return v_notification;
end $$;

-- Cancel: frees the slot and offers it onward. Returns the offer notification id.
create or replace function public.cancel_appointment(p_appointment_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_appt appointments;
begin
  select * into v_appt from appointments where id = p_appointment_id for update;
  if not found then raise exception 'appointment_not_found'; end if;
  if v_appt.status = 'cancelled' then return null; end if;
  update appointments set status = 'cancelled' where id = p_appointment_id;
  update slots set status = 'free', held_until = null where id = v_appt.slot_id;
  return offer_freed_slot(v_appt.slot_id);
end $$;

-- Accept an earlier-slot or reschedule offer: move the appointment atomically,
-- free the old slot and offer it onward.
create or replace function public.accept_slot_offer(p_notification_id uuid)
returns public.appointments
language plpgsql
set search_path = public
as $$
declare
  v_n notifications;
  v_appt appointments;
  v_new slots;
  v_old_slot uuid;
begin
  select * into v_n from notifications where id = p_notification_id for update;
  if not found then raise exception 'notification_not_found'; end if;
  if v_n.action_state <> 'pending' then raise exception 'offer_not_pending'; end if;

  select * into v_appt from appointments
  where id = (v_n.payload ->> 'appointment_id')::uuid for update;
  select * into v_new from slots where id = (v_n.payload ->> 'slot_id')::uuid for update;
  if v_new.status = 'booked' then
    update notifications set action_state = 'expired' where id = p_notification_id;
    raise exception 'slot_taken';
  end if;

  v_old_slot := v_appt.slot_id;
  update slots set status = 'booked', held_until = null where id = v_new.id;
  update appointments set slot_id = v_new.id, status = 'confirmed',
    patient_availability_json = null
  where id = v_appt.id returning * into v_appt;
  update notifications set action_state = 'accepted', read_at = now() where id = p_notification_id;

  update slots set status = 'free', held_until = null where id = v_old_slot;
  -- Offer the old slot onward, but never back to the appointment that just left it.
  perform offer_freed_slot(v_old_slot, v_appt.id);
  return v_appt;
end $$;

-- Decline an offer: release the held slot and offer it to the next patient.
create or replace function public.decline_slot_offer(p_notification_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_n notifications;
  v_slot uuid;
begin
  select * into v_n from notifications where id = p_notification_id for update;
  if not found then raise exception 'notification_not_found'; end if;
  if v_n.action_state <> 'pending' then return null; end if;
  update notifications set action_state = 'declined', read_at = now() where id = p_notification_id;
  v_slot := (v_n.payload ->> 'slot_id')::uuid;
  if v_n.kind = 'reschedule_offer' then
    update slots set status = 'free', held_until = null where id = v_slot and status = 'held';
    return null;
  end if;
  return offer_freed_slot(v_slot);
end $$;

-- "Ne paše mi": record when the patient is free; the institution answers.
create or replace function public.request_reschedule(p_appointment_id uuid, p_availability jsonb)
returns public.appointments
language plpgsql
set search_path = public
as $$
declare
  v_appt appointments;
begin
  update appointments
  set status = 'reschedule_requested', patient_availability_json = p_availability
  where id = p_appointment_id and status in ('proposed', 'confirmed', 'reschedule_requested')
  returning * into v_appt;
  if not found then raise exception 'appointment_not_reschedulable'; end if;
  -- A proposal that was never confirmed releases its hold right away.
  update slots set status = 'free', held_until = null
  where id = v_appt.slot_id and status = 'held';
  return v_appt;
end $$;

-- Institution panel answers a reschedule request with a concrete slot.
create or replace function public.offer_reschedule(p_appointment_id uuid, p_slot_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_appt appointments;
  v_slot slots;
  v_case uuid;
  v_inst institutions;
  v_old timestamptz;
  v_notification uuid;
begin
  select * into v_appt from appointments where id = p_appointment_id for update;
  if not found or v_appt.status <> 'reschedule_requested' then
    raise exception 'appointment_not_rescheduling';
  end if;
  select * into v_slot from slots where id = p_slot_id for update;
  if v_slot.status <> 'free' then raise exception 'slot_taken'; end if;

  update slots set status = 'held', held_until = now() + interval '15 minutes' where id = p_slot_id;
  select case_id into v_case from referrals where id = v_appt.referral_id;
  select * into v_inst from institutions where id = v_slot.institution_id;
  select starts_at into v_old from slots where id = v_appt.slot_id;

  insert into notifications (patient_id, case_id, kind, payload, action_state)
  values (v_appt.patient_id, v_case, 'reschedule_offer',
          jsonb_build_object(
            'appointment_id', v_appt.id,
            'slot_id', p_slot_id,
            'starts_at', v_slot.starts_at,
            'old_starts_at', v_old,
            'institution_name', v_inst.name),
          'pending')
  returning id into v_notification;
  return v_notification;
end $$;

-- Institution panel "Oslobodi termin": a booked slot becomes free (simulated
-- cancellation by another patient) and is offered onward.
create or replace function public.free_slot(p_slot_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_appt uuid;
begin
  select id into v_appt from appointments
  where slot_id = p_slot_id and status <> 'cancelled' for update;
  if found then
    return cancel_appointment(v_appt);
  end if;
  update slots set status = 'free', held_until = null where id = p_slot_id;
  return offer_freed_slot(p_slot_id);
end $$;

-- ---------------------------------------------------------------- lookups
-- Fold Croatian diacritics for search ("Varazdin" finds "Varaždin").
create or replace function public.fold_hr(p text)
returns text
language sql immutable
as $$ select lower(translate(replace(replace(coalesce(p, ''), 'đ', 'dj'), 'Đ', 'Dj'),
                             'čćšžČĆŠŽ', 'ccszCCSZ')) $$;

-- Approximate centre of a town from our open data (used when the patient
-- types a city instead of sharing GPS). Null when the town is unknown.
create or replace function public.city_point(p_city text)
returns table (city text, lat double precision, lng double precision, n integer)
language sql stable
set search_path = public, extensions
as $$
  select min(i.city),
         avg(st_y(i.geom::geometry)), avg(st_x(i.geom::geometry)),
         count(*)::integer
  from institutions i
  where i.geom is not null and fold_hr(i.city) = fold_hr(trim(p_city))
    and i.geo_precision in ('street', 'geoportal', 'osm', 'village')
  having count(*) > 0
$$;

-- Onboarding: find a chosen doctor by name or town.
create or replace function public.search_practitioners(p_role text, p_query text, p_limit integer default 20)
returns table (
  id text, full_name text, role text, provider_name text,
  institution_name text, address text, city text
)
language sql stable
set search_path = public
as $$
  select p.id, p.full_name, p.role, p.provider_name, i.name, i.address, i.city
  from practitioners p
  join institutions i on i.id = p.institution_id
  where p.role = p_role
    and (fold_hr(p.full_name) like '%' || fold_hr(trim(p_query)) || '%'
         or fold_hr(i.city) like fold_hr(trim(p_query)) || '%')
  order by (fold_hr(i.city) = fold_hr(trim(p_query))) desc, p.full_name
  limit least(greatest(p_limit, 1), 50)
$$;

-- ---------------------------------------------------------------- read helpers
-- Plain lat/lng next to the geography column (easy to read from the app).
alter table public.cases
  add column patient_lat double precision,
  add column patient_lng double precision,
  add column location_source text check (location_source in ('gps', 'city', 'chat', 'home'));

-- A persona with home point and chosen doctors (synthetic data; server only).
create or replace function public.patient_profile(p_patient_id uuid)
returns jsonb
language sql stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'birth_year', p.birth_year, 'home_city', p.home_city,
    'email', p.email, 'note', p.note,
    'home_lat', st_y(p.home_geom::geometry), 'home_lng', st_x(p.home_geom::geometry),
    'doctors', coalesce((
      select jsonb_agg(jsonb_build_object(
        'role', pp.role, 'practitioner_id', pr.id, 'full_name', pr.full_name,
        'provider_name', pr.provider_name,
        'institution_id', i.id, 'institution_name', i.name, 'address', i.address,
        'city', i.city, 'phone', i.phone,
        'lat', st_y(i.geom::geometry), 'lng', st_x(i.geom::geometry)) order by pp.role)
      from patient_practitioners pp
      join practitioners pr on pr.id = pp.practitioner_id
      join institutions i on i.id = pr.institution_id
      where pp.patient_id = p.id), '[]'::jsonb))
  from patients p where p.id = p_patient_id
$$;

-- Public institution card: location, contact, weekly hours, open now.
create or replace function public.institution_card(p_institution_id text, p_at timestamptz default now())
returns jsonb
language sql stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'id', i.id, 'name', i.name, 'type', i.type, 'address', i.address, 'city', i.city,
    'phone', i.phone, 'web', i.web, 'geo_precision', i.geo_precision,
    'source_dataset', i.source_dataset,
    'lat', st_y(i.geom::geometry), 'lng', st_x(i.geom::geometry),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'opens', h.opens,
                       'closes', h.closes, 'is_on_call', h.is_on_call, 'source', h.source)
                       order by h.weekday, h.opens)
      from institution_hours h where h.institution_id = i.id), '[]'::jsonb),
    'open', (select to_jsonb(o) from open_status(i.id, p_at) o))
  from institutions i where i.id = p_institution_id
$$;

-- ---------------------------------------------------------------- lock down
-- Only the server (service role) may change state. The public key keeps the
-- read-only search functions from the earlier migration.
do $$
declare f text;
begin
  foreach f in array array[
    'hit_rate_limit(text, integer, integer)',
    'release_expired_holds()',
    'propose_appointment(uuid)',
    'confirm_appointment(uuid)',
    'offer_freed_slot(uuid, uuid)',
    'cancel_appointment(uuid)',
    'accept_slot_offer(uuid)',
    'decline_slot_offer(uuid)',
    'request_reschedule(uuid, jsonb)',
    'offer_reschedule(uuid, uuid)',
    'free_slot(uuid)',
    'generate_demo_slots(date, integer)',
    'patient_profile(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
end $$;

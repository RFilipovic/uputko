-- Fix: a proposed appointment whose 15-minute hold ran out sets its slot back
-- to 'free' but stays 'proposed'. The next booking then picked that slot and
-- failed on appointments_live_slot_idx, so patients saw "no free slot" although
-- slots were free. A slot is available only if it is free AND no live
-- appointment points at it. (A late confirm of the old proposal still works
-- while nobody else has the slot.)

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
    -- A slot whose 15-min hold ran out is 'free' again, but the old proposed
    -- appointment still points at it; skip it (one live appointment per slot).
    and not exists (
      select 1 from appointments a
      where a.slot_id = slots.id and a.status <> 'cancelled')
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
  if v_slot.status <> 'free' or exists (
    select 1 from appointments a
    where a.slot_id = p_slot_id and a.status <> 'cancelled')
  then raise exception 'slot_taken'; end if;

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

revoke execute on function public.propose_appointment(uuid) from public, anon, authenticated;
revoke execute on function public.offer_reschedule(uuid, uuid) from public, anon, authenticated;

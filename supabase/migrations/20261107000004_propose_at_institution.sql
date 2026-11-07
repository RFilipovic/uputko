-- Edge case: the hospital on the uputnica has no free slot in the next 3 weeks.
-- The app then tries the nearest other hospitals with the same specialty and
-- tells the patient. Same rules as propose_appointment(): earliest free slot at
-- least 2 h ahead, no live appointment on it, held for 15 minutes.
create or replace function public.propose_appointment_at(p_referral_id uuid, p_institution_id text)
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
  where institution_id = p_institution_id and specialty_code = r.specialty_code
    and status = 'free' and starts_at > now() + interval '2 hours'
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

revoke execute on function public.propose_appointment_at(uuid, text) from public, anon, authenticated;

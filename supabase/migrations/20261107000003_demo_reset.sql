-- Demo-safe mode: "Počni ispočetka" before each video take.
-- Removes every case of the synthetic personas (messages, referrals,
-- appointments, events and doctor links go with them by cascade), frees the
-- slots their appointments held, and clears their notifications.
-- Touches synthetic patients only (patients.is_synthetic = true).
create or replace function public.demo_reset()
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_slots integer;
  v_cases integer;
begin
  with freed as (
    update slots s set status = 'free', held_until = null
    where s.id in (
      select a.slot_id from appointments a
      join patients p on p.id = a.patient_id
      where p.is_synthetic)
    returning 1)
  select count(*) into v_slots from freed;

  delete from notifications n
  using patients p
  where p.id = n.patient_id and p.is_synthetic;

  with gone as (
    delete from cases c
    using patients p
    where p.id = c.patient_id and p.is_synthetic
    returning 1)
  select count(*) into v_cases from gone;

  return jsonb_build_object('cases_removed', v_cases, 'slots_freed', v_slots);
end $$;

comment on function public.demo_reset() is
  'Demo-safe mode: clear the synthetic personas'' cases and free their slots.';

revoke execute on function public.demo_reset() from public, anon, authenticated;

-- Geo search, opening-hours status, synthetic slot generator, RLS, Realtime.

-- Is an institution open at a given moment (Europe/Zagreb)? NULL = no hours known.
create or replace function public.open_status(p_institution_id text, p_at timestamptz default now())
returns table (has_hours boolean, open_now boolean, closes_at time, is_on_call boolean)
language sql stable
set search_path = public
as $$
  with local as (
    select extract(isodow from p_at at time zone 'Europe/Zagreb')::smallint as wd,
           (p_at at time zone 'Europe/Zagreb')::time as t
  )
  select
    exists (select 1 from institution_hours h where h.institution_id = p_institution_id),
    case when not exists (select 1 from institution_hours h where h.institution_id = p_institution_id)
         then null
         else coalesce(bool_or(l.t >= h.opens and (l.t < h.closes or h.closes = '24:00')), false)
    end,
    max(h.closes) filter (where l.t >= h.opens and (l.t < h.closes or h.closes = '24:00')),
    coalesce(bool_or(h.is_on_call), false)
  from local l
  left join institution_hours h
    on h.institution_id = p_institution_id and h.weekday = l.wd
$$;

-- Nearest institutions offering a specialty, KNN on the GIST index.
--   select * from nearest_institutions('kardiologija', 43.51, 16.44);
create or replace function public.nearest_institutions(
  p_specialty text,
  p_lat double precision,
  p_lng double precision,
  p_limit integer default 10,
  p_open_now boolean default false,
  p_at timestamptz default now()
)
returns table (
  id text, name text, type text, address text, city text, phone text, web text,
  lat double precision, lng double precision, distance_km numeric,
  geo_precision text, source_dataset text,
  has_hours boolean, open_now boolean, closes_at time, is_on_call boolean
)
language sql stable
set search_path = public, extensions
as $$
  with here as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g),
  candidates as (
    select i.*
    from institutions i
    join institution_services s on s.institution_id = i.id and s.specialty_code = p_specialty
    where i.geom is not null
    order by i.geom <-> (select g from here)
    limit greatest(p_limit, 1) * (case when p_open_now then 20 else 5 end)
  )
  select c.id, c.name, c.type, c.address, c.city, c.phone, c.web,
         st_y(c.geom::geometry), st_x(c.geom::geometry),
         round((st_distance(c.geom, (select g from here)) / 1000)::numeric, 2),
         c.geo_precision, c.source_dataset,
         o.has_hours, o.open_now, o.closes_at, o.is_on_call
  from candidates c
  cross join lateral open_status(c.id, p_at) o
  where not p_open_now or o.open_now
  -- Approximate coordinates (postcode/town centre) can sit far from the real
  -- practice, so they rank behind exact ones at a similar distance.
  order by st_distance(c.geom, (select g from here))
           + case c.geo_precision when 'postcode' then 5000 when 'city' then 5000
                                  when 'village' then 1000 else 0 end
  limit p_limit
$$;

-- Synthetic appointment slots (demo only): weekdays 08:00–14:00, 30 min,
-- at hospitals in the demo cities, for the specialties they offer.
-- Deterministic "randomness" (hashtext) so every reset looks the same.
create or replace function public.generate_demo_slots(
  p_from date default current_date,
  p_days integer default 21
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  n integer;
begin
  delete from slots s
  where not exists (select 1 from appointments a where a.slot_id = s.id);

  insert into slots (institution_id, specialty_code, starts_at, ends_at, status)
  select s.institution_id, s.specialty_code,
         (d + interval '8 hours' + k * interval '30 minutes') at time zone 'Europe/Zagreb',
         (d + interval '8 hours 30 minutes' + k * interval '30 minutes') at time zone 'Europe/Zagreb',
         -- Realistic waiting list: the first 5 days are full, later ~30% is taken.
         case when d < p_from + 6
                or abs(hashtext(s.institution_id || s.specialty_code || d::text || k::text)) % 10 < 3
              then 'booked' else 'free' end
  from institution_services s
  join institutions i on i.id = s.institution_id
  cross join generate_series((p_from + 1)::timestamp, (p_from + p_days)::timestamp,
                             interval '1 day') as d
  cross join generate_series(0, 11) as k  -- 08:00 … 13:30
  where i.type in ('KBC', 'KB', 'OB', 'klinika')
    and i.city in ('Zagreb', 'Split', 'Rijeka', 'Osijek', 'Varaždin', 'Dubrovnik')
    and s.specialty_code in (
      'otorinolaringologija', 'kardiologija', 'neurologija', 'oftalmologija',
      'dermatologija-i-venerologija', 'ortopedija', 'gastroenterologija',
      'interna-medicina', 'pedijatrija', 'ginekologija-i-opstetricija', 'ultrazvuk',
      'urologija', 'pulmologija', 'endokrinologija', 'reumatologija', 'psihijatrija')
    and extract(isodow from d) between 1 and 5
    -- Keep roughly a third of possible slots so the calendar has realistic gaps.
    and abs(hashtext(s.specialty_code || i.id || d::text || k::text)) % 3 = 0;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------- RLS
-- Open data is world-readable. Patient-side tables have RLS on and no anon
-- policies: only server routes (service role) read/write them.
alter table public.institutions          enable row level security;
alter table public.specialties           enable row level security;
alter table public.institution_services  enable row level security;
alter table public.institution_hours     enable row level security;
alter table public.practitioners         enable row level security;

create policy "open data is public" on public.institutions         for select using (true);
create policy "open data is public" on public.specialties          for select using (true);
create policy "open data is public" on public.institution_services for select using (true);
create policy "open data is public" on public.institution_hours    for select using (true);
create policy "open data is public" on public.practitioners        for select using (true);

alter table public.patients               enable row level security;
alter table public.patient_practitioners  enable row level security;
alter table public.cases                  enable row level security;
alter table public.messages               enable row level security;
alter table public.referrals              enable row level security;
alter table public.slots                  enable row level security;
alter table public.appointments           enable row level security;
alter table public.notifications          enable row level security;
alter table public.case_events            enable row level security;

-- ---------------------------------------------------------------- Realtime
alter publication supabase_realtime add table
  public.case_events, public.notifications, public.appointments, public.referrals;

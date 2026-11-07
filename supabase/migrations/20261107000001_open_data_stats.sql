-- Read-only counts for the public "Javni podaci" page: what the open data
-- contains and how much of it we linked across sources.
create or replace function public.open_data_stats()
returns jsonb
language sql stable
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'institutions', (select count(*) from institutions),
    'hospitals', (select count(*) from institutions
                  where type in ('KBC', 'KB', 'klinika', 'OB', 'specijalna_bolnica')),
    'health_centres', (select count(*) from institutions where type = 'DZ'),
    'emergency', (select count(distinct institution_id) from institution_services
                  where specialty_code = 'hitna-medicina-ohbp'),
    'linked', (select count(*) from institutions where source_dataset like '%+%'),
    'located', (select count(*) from institutions where geom is not null),
    'cities', (select count(distinct city) from institutions where city is not null),
    'specialties', (select count(*) from specialties),
    'practitioners', (select jsonb_object_agg(role, n) from (
                       select role, count(*) n from practitioners group by role) r),
    'top_cities', (select jsonb_agg(c order by (c->>'count')::int desc) from (
                    select jsonb_build_object(
                      'city', city,
                      'count', count(*),
                      'lat', avg(st_y(geom::geometry)),
                      'lng', avg(st_x(geom::geometry))) c
                    from institutions
                    where city is not null and geom is not null
                    group by city
                    order by count(*) desc
                    limit 12) t)
  )
$$;

comment on function public.open_data_stats() is
  'Counts for the public open-data page. Reads reference data only.';

revoke execute on function public.open_data_stats() from public, anon, authenticated;

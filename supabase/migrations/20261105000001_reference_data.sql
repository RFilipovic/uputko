-- Reference data from open data (HZZO, Grad Zagreb geoportal, OpenStreetMap).
-- Shaped after HL7 FHIR: Organization/Location, HealthcareService, Practitioner.

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create table public.institutions (
  id              text primary key,
  name            text not null,
  type            text not null check (type in (
                    'KBC', 'KB', 'klinika', 'OB', 'specijalna_bolnica',
                    'DZ', 'poliklinika', 'ordinacija', 'ostalo')),
  address         text,
  postcode        text,
  city            text,
  county          text,
  geom            extensions.geography(Point, 4326),
  -- How we got the coordinates: geoportal | osm | street | name | postcode | city
  geo_precision   text,
  phone           text,
  email           text,
  web             text,
  hzzo_code       text,
  osm_id          text,
  source_dataset  text not null
);
comment on table public.institutions is 'FHIR Organization/Location. Hospitals, practices, health centres.';

create index institutions_geom_idx on public.institutions using gist (geom);
create index institutions_city_idx on public.institutions (city);

create table public.specialties (
  code        text primary key,           -- slug, e.g. 'otorinolaringologija'
  name        text not null,              -- Croatian display name
  hzzo_code   text                         -- HZZO šifra djelatnosti, if any
);

create table public.institution_services (
  institution_id  text not null references public.institutions (id) on delete cascade,
  specialty_code  text not null references public.specialties (code),
  units           numeric,               -- HZZO contracted clinic units, where known
  source_dataset  text not null,
  primary key (institution_id, specialty_code)
);
comment on table public.institution_services is 'FHIR HealthcareService.';
create index institution_services_specialty_idx on public.institution_services (specialty_code);

create table public.institution_hours (
  id              bigint generated always as identity primary key,
  institution_id  text not null references public.institutions (id) on delete cascade,
  weekday         smallint not null check (weekday between 1 and 7),  -- ISO: 1 = Monday
  opens           time not null,
  closes          time not null,            -- '24:00' allowed
  is_on_call      boolean not null default false,  -- dežurstvo
  -- osm | ohbp_0-24 | demo_hand_filled
  source          text not null
);
comment on table public.institution_hours is 'FHIR Location.hoursOfOperation. Times are Europe/Zagreb local.';
create index institution_hours_inst_idx on public.institution_hours (institution_id, weekday);

create table public.practitioners (
  id              text primary key,
  full_name       text not null,
  role            text not null check (role in ('obiteljski', 'stomatolog', 'ginekolog', 'pedijatar')),
  team_code       text,
  institution_id  text references public.institutions (id),
  provider_name   text,
  status          text,             -- 'dz' (dom zdravlja) | 'konces' (koncesija)
  insured_count   integer,
  source_dataset  text not null
);
comment on table public.practitioners is 'FHIR Practitioner + PractitionerRole (location = institution).';
create index practitioners_role_idx on public.practitioners (role);
create index practitioners_institution_idx on public.practitioners (institution_id);
create index practitioners_name_trgm_idx on public.practitioners using gin (full_name extensions.gin_trgm_ops);

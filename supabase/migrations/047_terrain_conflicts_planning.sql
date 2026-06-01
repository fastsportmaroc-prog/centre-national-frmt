-- Conflits terrain — PROD (sans terrain_reservations)
-- Table utilisée par l'app V2 : reservations_infrastructure (+ planning si présent).

-- ─── reservations_infrastructure ───
alter table public.reservations_infrastructure
  add column if not exists creneau text,
  add column if not exists heure_debut text,
  add column if not exists heure_fin text;

update public.reservations_infrastructure
set
  heure_debut = coalesce(
    nullif(trim(heure_debut), ''),
    to_char(date_debut::time, 'HH24:MI')
  ),
  heure_fin = coalesce(
    nullif(trim(heure_fin), ''),
    to_char(date_fin::time, 'HH24:MI')
  )
where heure_debut is null
   or heure_fin is null
   or trim(coalesce(heure_debut, '')) = ''
   or trim(coalesce(heure_fin, '')) = '';

update public.reservations_infrastructure
set creneau = case
  when coalesce(nullif(trim(creneau), ''), '') <> '' then trim(creneau)
  when heure_debut = '09:00' and heure_fin = '18:00' then 'journee'
  when heure_debut >= '14:00' then 'apres_midi'
  when heure_fin <= '13:00' then 'matin'
  else 'journee'
end
where creneau is null or trim(coalesce(creneau, '')) = '';

delete from public.reservations_infrastructure a
using public.reservations_infrastructure b
where a.id < b.id
  and a.stage_id is not distinct from b.stage_id
  and a.infrastructure_id = b.infrastructure_id
  and (a.date_debut::date) = (b.date_debut::date)
  and coalesce(a.creneau, '') = coalesce(b.creneau, '');

create index if not exists idx_res_infra_lookup
  on public.reservations_infrastructure (infrastructure_id, date_debut);

create unique index if not exists unique_res_infra_stage_day_creneau
  on public.reservations_infrastructure (
    stage_id,
    infrastructure_id,
    (date_debut::date),
    coalesce(creneau, '')
  )
  where stage_id is not null;

-- ─── planning (SQL dynamique : pas de référence compilée si table absente) ───
do $migration$
begin
  if to_regclass('public.planning') is null then
    raise notice 'Table planning absente — étape ignorée.';
    return;
  end if;

  execute 'alter table public.planning add column if not exists notes text';
  execute 'create index if not exists idx_planning_stage_date on public.planning (stage_id, date)';
end
$migration$;

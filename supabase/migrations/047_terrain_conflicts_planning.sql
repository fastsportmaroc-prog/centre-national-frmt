-- Conflits terrain : horaires explicites, dédoublonnage, index
-- Compatible prod sans table terrain_reservations (optionnelle, voir 031).

-- ─── reservations_infrastructure (source canonique V2) ───
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
   or trim(heure_debut) = ''
   or trim(heure_fin) = '';

update public.reservations_infrastructure
set creneau = case
  when coalesce(nullif(trim(creneau), ''), '') <> '' then trim(creneau)
  when heure_debut = '09:00' and heure_fin = '18:00' then 'journee'
  when heure_debut >= '14:00' then 'apres_midi'
  when heure_fin <= '13:00' then 'matin'
  else 'journee'
end
where creneau is null or trim(creneau) = '';

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

-- ─── planning ───
alter table public.planning
  add column if not exists notes text;

create index if not exists idx_planning_stage_date
  on public.planning (stage_id, date);

-- ─── terrain_reservations (uniquement si migration 031 déjà appliquée) ───
do $$
begin
  if to_regclass('public.terrain_reservations') is null then
    raise notice 'terrain_reservations absente — étape ignorée (OK en prod V2).';
    return;
  end if;

  alter table public.terrain_reservations
    add column if not exists heure_debut time,
    add column if not exists heure_fin time;

  update public.terrain_reservations
  set
    heure_debut = case creneau
      when 'matin' then '09:00'::time
      when 'apres-midi' then '14:00'::time
      when 'journee' then '09:00'::time
      else '09:00'::time
    end,
    heure_fin = case creneau
      when 'matin' then '13:00'::time
      when 'apres-midi' then '18:00'::time
      when 'journee' then '18:00'::time
      else '18:00'::time
    end
  where heure_debut is null;

  delete from public.terrain_reservations a
  using public.terrain_reservations b
  where a.id < b.id
    and a.stage_id = b.stage_id
    and a.terrain_id = b.terrain_id
    and a.date_debut = b.date_debut
    and a.creneau = b.creneau;

  create unique index if not exists unique_terrain_res_stage_terrain_date_creneau
    on public.terrain_reservations (stage_id, terrain_id, creneau, date_debut);

  create index if not exists idx_terrain_res_lookup
    on public.terrain_reservations (terrain_id, date_debut);
end $$;

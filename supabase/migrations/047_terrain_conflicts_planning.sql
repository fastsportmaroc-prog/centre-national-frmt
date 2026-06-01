-- Conflits terrain : horaires explicites, dédoublonnage, index de recherche

alter table public.terrain_reservations
  add column if not exists heure_debut time,
  add column if not exists heure_fin time;

update public.terrain_reservations set
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

-- Dédoublonnage terrain_reservations
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

-- Dédoublonnage reservations_infrastructure (même jour + infra + stage + créneau)
delete from public.reservations_infrastructure a
using public.reservations_infrastructure b
where a.id < b.id
  and a.stage_id is not distinct from b.stage_id
  and a.infrastructure_id = b.infrastructure_id
  and (a.date_debut::date) = (b.date_debut::date)
  and coalesce(a.creneau, '') = coalesce(b.creneau, '');

create index if not exists idx_res_infra_lookup
  on public.reservations_infrastructure (infrastructure_id, date_debut);

-- Planning auto depuis terrains : marqueur dans notes (colonne optionnelle)
alter table public.planning
  add column if not exists notes text;

create index if not exists idx_planning_stage_date
  on public.planning (stage_id, date);

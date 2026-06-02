-- Vue calendrier alignée sur reservations_infrastructure (prod V2)

create or replace view public.v_calendrier_terrains as
select
  r.id as reservation_id,
  r.infrastructure_id as terrain_id,
  i.nom as terrain_nom,
  coalesce(i.type, 'court-tennis') as terrain_type,
  coalesce(i.surface, '—') as terrain_surface,
  r.stage_id,
  s.stage_action as stage_nom,
  s.categorie as stage_categorie,
  s.statut as stage_statut,
  (r.date_debut::date)::text as date_debut,
  (r.date_fin::date)::text as date_fin,
  case
    when coalesce(r.creneau, '') in ('matin', 'apres_midi', 'journee') then
      replace(r.creneau, '_', '-')
    when r.heure_debut = '09:00' and r.heure_fin = '13:00' then 'matin'
    when r.heure_debut >= '14:00' then 'apres-midi'
    else 'journee'
  end as creneau,
  case
    when r.notes like '%[MODE:dispatch]%' then 'dispatch'
    else 'stage'
  end as mode,
  coalesce(r.statut, 'confirmee') as resa_statut,
  0::int as nb_joueurs_dispatches
from public.reservations_infrastructure r
left join public.infrastructures i on i.id = r.infrastructure_id
left join public.stages_programme s on s.id = r.stage_id
where r.stage_id is not null
  and coalesce(r.statut, '') not ilike '%annul%';

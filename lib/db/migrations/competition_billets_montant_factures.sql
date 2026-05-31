-- Montants billets compétition + factures prestataires billets avion

alter table public.competition_billets
  add column if not exists montant numeric(12, 2),
  add column if not exists devise text not null default 'MAD';

alter table public.competitions
  add column if not exists billet_tarif_mode text not null default 'individuel'
    check (billet_tarif_mode in ('individuel', 'groupe')),
  add column if not exists montant_billet_groupe numeric(12, 2);

alter table public.factures_prestataires
  alter column stage_id drop not null;

alter table public.factures_prestataires
  add column if not exists competition_id uuid references public.competitions(id) on delete cascade;

alter table public.factures_prestataires
  drop constraint if exists factures_prestataires_service_type_check;

alter table public.factures_prestataires
  add constraint factures_prestataires_service_type_check
  check (service_type in ('hebergement', 'restauration', 'billets_avion'));

alter table public.factures_prestataires
  drop constraint if exists factures_prestataires_scope_check;

alter table public.factures_prestataires
  add constraint factures_prestataires_scope_check
  check (
    (stage_id is not null and competition_id is null)
    or (competition_id is not null and stage_id is null)
  );

create unique index if not exists idx_factures_prestataires_competition_service
  on public.factures_prestataires(competition_id, service_type)
  where competition_id is not null;

create unique index if not exists idx_factures_prestataires_stage_service
  on public.factures_prestataires(stage_id, service_type)
  where stage_id is not null;

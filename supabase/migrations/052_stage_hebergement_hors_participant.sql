-- 052_stage_hebergement_hors_participant.sql
-- Permet d'ajouter des personnes hors liste participants dans l'onglet Hébergement.

alter table public.stage_hebergement_participants
  add column if not exists external_nom text,
  add column if not exists external_prenom text;

alter table public.stage_hebergement_participants
  alter column participant_id drop not null;

do $$
begin
  alter table public.stage_hebergement_participants
    drop constraint if exists stage_hebergement_participants_participant_type_check;
exception when undefined_object then
  null;
end $$;

alter table public.stage_hebergement_participants
  add constraint stage_hebergement_participants_participant_type_check
  check (participant_type in ('joueur', 'coach', 'hors_participant'));

-- Remplace l'unique global (incompatible avec participant_id nullable)
drop index if exists stage_hebergement_participants_stage_id_participant_id_participant_type_key;
drop index if exists uq_stage_heberg_participant_regular;
create unique index if not exists uq_stage_heberg_participant_regular
  on public.stage_hebergement_participants(stage_id, participant_id, participant_type)
  where participant_id is not null and participant_type in ('joueur', 'coach');

-- Validation des lignes hors participant
do $$
begin
  alter table public.stage_hebergement_participants
    drop constraint if exists stage_hebergement_participants_external_name_check;
exception when undefined_object then
  null;
end $$;

alter table public.stage_hebergement_participants
  add constraint stage_hebergement_participants_external_name_check
  check (
    participant_type <> 'hors_participant'
    or (coalesce(trim(external_nom), '') <> '')
  );

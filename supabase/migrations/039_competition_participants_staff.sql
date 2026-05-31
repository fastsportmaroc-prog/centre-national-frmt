-- Types de participants compétition : kiné, membre fédéral, autre (saisie libre)

alter table public.competition_participants
  add column if not exists libelle text;

alter table public.competition_participants
  drop constraint if exists competition_participants_participant_type_check;

alter table public.competition_participants
  add constraint competition_participants_participant_type_check
  check (participant_type in ('joueur', 'coach', 'kine', 'federal', 'autre'));

-- Complément module Compétitions — kiné / fédéral / autre
-- (copie de supabase/migrations/039_competition_participants_staff.sql)

alter table public.competition_participants
  add column if not exists libelle text;

alter table public.competition_participants
  drop constraint if exists competition_participants_participant_type_check;

alter table public.competition_participants
  add constraint competition_participants_participant_type_check
  check (participant_type in ('joueur', 'coach', 'kine', 'federal', 'autre'));

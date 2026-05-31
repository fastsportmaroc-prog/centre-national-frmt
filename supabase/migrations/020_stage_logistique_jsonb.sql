-- Migration NON destructive — à appliquer manuellement en local si souhaité.
-- Stocke la configuration logistique stage (participants, hébergement, restauration, terrains).
-- L'application fonctionne aussi via encodage JSON dans notes (fallback).

alter table public.stages_programme
  add column if not exists logistique jsonb;

comment on column public.stages_programme.logistique is
  'Configuration formulaire stage : participants, hébergement, restauration, terrains';

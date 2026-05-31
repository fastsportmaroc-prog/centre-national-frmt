-- À exécuter si competition_billets existe déjà (complément module Compétitions)
alter table public.competition_billets
  add column if not exists aeroport_depart text,
  add column if not exists aeroport_retour text,
  add column if not exists aeroport_depart_iata text,
  add column if not exists aeroport_retour_iata text;

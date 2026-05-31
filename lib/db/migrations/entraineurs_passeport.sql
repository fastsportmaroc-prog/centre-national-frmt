-- Colonnes passeport sur la fiche entraîneur (synchronisation avec Passeports & Visas)
-- À exécuter une fois dans Supabase → SQL Editor

alter table public.entraineurs
  add column if not exists passeport_numero text,
  add column if not exists passeport_expiration date;

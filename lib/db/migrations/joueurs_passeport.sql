-- À exécuter dans Supabase → SQL Editor si erreur "passeport_expiration column not found"

alter table public.joueurs
  add column if not exists passeport_numero text,
  add column if not exists passeport_expiration date;

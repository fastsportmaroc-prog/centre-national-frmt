-- Colonne photo_url sur entraîneurs (affichage liste + fiche)
alter table public.entraineurs
  add column if not exists photo_url text;

-- Évolution du classement entre deux synchronisations
alter table public.classements_externes
  add column if not exists evolution int,
  add column if not exists rang_precedent int;

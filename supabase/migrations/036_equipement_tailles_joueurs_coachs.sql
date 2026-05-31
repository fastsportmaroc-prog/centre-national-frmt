-- Tailles textiles + chaussures (joueurs et entraîneurs)
alter table public.joueurs add column if not exists taille_chaussures text;

alter table public.entraineurs add column if not exists taille_survetement text;
alter table public.entraineurs add column if not exists taille_tshirt text;
alter table public.entraineurs add column if not exists taille_short text;
alter table public.entraineurs add column if not exists taille_jupe text;
alter table public.entraineurs add column if not exists taille_chaussures text;

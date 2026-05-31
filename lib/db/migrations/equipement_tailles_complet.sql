-- Tailles textiles & chaussures — joueurs + entraîneurs
-- Exécuter dans Supabase → SQL Editor, puis recharger le schéma API si besoin.

alter table public.joueurs add column if not exists taille_survetement text;
alter table public.joueurs add column if not exists taille_tshirt text;
alter table public.joueurs add column if not exists taille_short text;
alter table public.joueurs add column if not exists taille_jupe text;
alter table public.joueurs add column if not exists taille_chaussures text;

alter table public.entraineurs add column if not exists taille_survetement text;
alter table public.entraineurs add column if not exists taille_tshirt text;
alter table public.entraineurs add column if not exists taille_short text;
alter table public.entraineurs add column if not exists taille_jupe text;
alter table public.entraineurs add column if not exists taille_chaussures text;

-- Rafraîchir le cache PostgREST (Supabase)
alter table public.joueurs add column if not exists ipin text;

notify pgrst, 'reload schema';

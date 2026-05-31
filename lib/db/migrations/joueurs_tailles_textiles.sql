-- Tailles textiles équipe (survêtement, t-shirt, short, jupe filles)
alter table public.joueurs add column if not exists taille_survetement text;
alter table public.joueurs add column if not exists taille_tshirt text;
alter table public.joueurs add column if not exists taille_short text;
alter table public.joueurs add column if not exists taille_jupe text;

-- Identifiant IPIN (ITF / compétitions internationales)
alter table public.joueurs add column if not exists ipin text;

notify pgrst, 'reload schema';

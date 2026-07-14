-- Accès lecture classements_externes + contrainte upsert (table déjà créée côté Supabase)
-- N'altère pas la table joueurs.

create unique index if not exists classements_externes_joueur_categorie_key
  on public.classements_externes (joueur_id, categorie);

alter table public.classements_externes enable row level security;

drop policy if exists "classements_externes_select_auth" on public.classements_externes;
create policy "classements_externes_select_auth"
  on public.classements_externes
  for select
  to authenticated
  using (true);

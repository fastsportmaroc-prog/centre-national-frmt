-- Politiques RLS manquantes sur les tables entraîneurs (013 activait RLS sans policy)

drop policy if exists "entraineurs_auth" on public.entraineurs;
create policy "entraineurs_auth" on public.entraineurs
  for all to authenticated using (true) with check (true);

drop policy if exists "missions_entraineur_auth" on public.missions_entraineur;
create policy "missions_entraineur_auth" on public.missions_entraineur
  for all to authenticated using (true) with check (true);

drop policy if exists "entraineur_depenses_auth" on public.entraineur_depenses;
create policy "entraineur_depenses_auth" on public.entraineur_depenses
  for all to authenticated using (true) with check (true);

drop policy if exists "disponibilites_entraineur_auth" on public.disponibilites_entraineur;
create policy "disponibilites_entraineur_auth" on public.disponibilites_entraineur
  for all to authenticated using (true) with check (true);

drop policy if exists "budget_annuel_auth" on public.budget_annuel;
create policy "budget_annuel_auth" on public.budget_annuel
  for all to authenticated using (true) with check (true);

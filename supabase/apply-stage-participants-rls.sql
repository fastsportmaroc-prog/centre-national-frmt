-- =============================================================================
-- AFFECTATION STAGE (stage_joueurs / stage_coachs)
-- À exécuter une fois dans Supabase → SQL Editor → Run
-- Corrige : new row violates row-level security policy for table "stage_joueurs"
-- =============================================================================

create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid() and coalesce(actif, true)),
    'viewer'
  );
$$;

grant execute on function public.get_user_role() to authenticated;

alter table public.stage_joueurs enable row level security;
alter table public.stage_coachs enable row level security;

drop policy if exists "auth_full_stage_joueurs" on public.stage_joueurs;
drop policy if exists "stage_joueurs_auth" on public.stage_joueurs;
drop policy if exists "stage_joueurs_select" on public.stage_joueurs;
drop policy if exists "stage_joueurs_write" on public.stage_joueurs;
drop policy if exists "stage_joueurs_update" on public.stage_joueurs;
drop policy if exists "stage_joueurs_delete" on public.stage_joueurs;

create policy "stage_joueurs_select" on public.stage_joueurs
  for select to authenticated using (true);

create policy "stage_joueurs_write" on public.stage_joueurs
  for insert to authenticated
  with check (
    public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer')
  );

create policy "stage_joueurs_update" on public.stage_joueurs
  for update to authenticated
  using (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'))
  with check (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'));

create policy "stage_joueurs_delete" on public.stage_joueurs
  for delete to authenticated
  using (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'));

drop policy if exists "auth_full_stage_coachs" on public.stage_coachs;
drop policy if exists "stage_coachs_auth" on public.stage_coachs;
drop policy if exists "stage_coachs_select" on public.stage_coachs;
drop policy if exists "stage_coachs_write" on public.stage_coachs;
drop policy if exists "stage_coachs_update" on public.stage_coachs;
drop policy if exists "stage_coachs_delete" on public.stage_coachs;

create policy "stage_coachs_select" on public.stage_coachs
  for select to authenticated using (true);

create policy "stage_coachs_write" on public.stage_coachs
  for insert to authenticated
  with check (
    public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer')
  );

create policy "stage_coachs_update" on public.stage_coachs
  for update to authenticated
  using (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'))
  with check (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'));

create policy "stage_coachs_delete" on public.stage_coachs
  for delete to authenticated
  using (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'));

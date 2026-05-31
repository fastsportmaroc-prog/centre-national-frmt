-- =============================================================================
-- AFFECTATION STAGE — clés étrangères (OBLIGATOIRE pour V2)
-- Supabase → SQL Editor → Run
--
-- Corrige au clic sur joueur/coach :
--   insert or update on table "stage_coachs" violates foreign key constraint
--   "stage_coachs_stage_id_fkey"
--
-- Cause : les pivots pointaient vers "stages" / "coachs" au lieu de
--         "stages_programme" / "entraineurs".
-- =============================================================================

create table if not exists public.stage_joueurs (
  stage_id uuid not null,
  joueur_id uuid not null,
  primary key (stage_id, joueur_id)
);

create table if not exists public.stage_coachs (
  stage_id uuid not null,
  coach_id uuid not null,
  primary key (stage_id, coach_id)
);

delete from public.stage_joueurs sj
where not exists (select 1 from public.stages_programme sp where sp.id = sj.stage_id);

delete from public.stage_coachs sc
where not exists (select 1 from public.stages_programme sp where sp.id = sc.stage_id);

delete from public.stage_coachs sc
where not exists (select 1 from public.entraineurs e where e.id = sc.coach_id);

alter table public.stage_joueurs drop constraint if exists stage_joueurs_stage_id_fkey;
alter table public.stage_joueurs drop constraint if exists stage_joueurs_joueur_id_fkey;
alter table public.stage_coachs drop constraint if exists stage_coachs_stage_id_fkey;
alter table public.stage_coachs drop constraint if exists stage_coachs_coach_id_fkey;

alter table public.stage_joueurs
  add constraint stage_joueurs_stage_id_fkey
  foreign key (stage_id) references public.stages_programme(id) on delete cascade;

alter table public.stage_joueurs
  add constraint stage_joueurs_joueur_id_fkey
  foreign key (joueur_id) references public.joueurs(id) on delete cascade;

alter table public.stage_coachs
  add constraint stage_coachs_stage_id_fkey
  foreign key (stage_id) references public.stages_programme(id) on delete cascade;

alter table public.stage_coachs
  add constraint stage_coachs_coach_id_fkey
  foreign key (coach_id) references public.entraineurs(id) on delete cascade;

-- RLS (si pas déjà fait via apply-stage-participants-rls.sql)
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

drop policy if exists "stage_joueurs_select" on public.stage_joueurs;
drop policy if exists "stage_joueurs_write" on public.stage_joueurs;
drop policy if exists "stage_joueurs_update" on public.stage_joueurs;
drop policy if exists "stage_joueurs_delete" on public.stage_joueurs;

create policy "stage_joueurs_select" on public.stage_joueurs
  for select to authenticated using (true);

create policy "stage_joueurs_write" on public.stage_joueurs
  for insert to authenticated
  with check (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'));

create policy "stage_joueurs_update" on public.stage_joueurs
  for update to authenticated
  using (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'))
  with check (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'));

create policy "stage_joueurs_delete" on public.stage_joueurs
  for delete to authenticated
  using (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'));

drop policy if exists "stage_coachs_select" on public.stage_coachs;
drop policy if exists "stage_coachs_write" on public.stage_coachs;
drop policy if exists "stage_coachs_update" on public.stage_coachs;
drop policy if exists "stage_coachs_delete" on public.stage_coachs;

create policy "stage_coachs_select" on public.stage_coachs
  for select to authenticated using (true);

create policy "stage_coachs_write" on public.stage_coachs
  for insert to authenticated
  with check (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'));

create policy "stage_coachs_update" on public.stage_coachs
  for update to authenticated
  using (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'))
  with check (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'));

create policy "stage_coachs_delete" on public.stage_coachs
  for delete to authenticated
  using (public.get_user_role() in ('admin', 'entraineur', 'direction', 'viewer'));

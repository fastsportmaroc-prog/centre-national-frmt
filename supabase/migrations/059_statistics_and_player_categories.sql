-- 059_statistics_module_and_player_categories.sql
-- Rubrique Statistiques distincte de Rapports + accès par catégorie de joueurs.

alter table public.user_permissions
  drop constraint if exists user_permissions_module_key_check;

alter table public.user_permissions
  add constraint user_permissions_module_key_check check (
    module_key in (
      'dashboard', 'players', 'coaches', 'stages', 'planning', 'kinesitherapy',
      'accommodation', 'catering', 'courts', 'equipment', 'documents',
      'budgets', 'passports_visas', 'history', 'reports', 'statistics', 'settings'
    )
  );

create table if not exists public.user_player_category_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_key text not null,
  can_view boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_key)
);

create index if not exists user_player_category_access_user_id_idx
  on public.user_player_category_access (user_id);

alter table public.user_player_category_access enable row level security;

drop policy if exists "user_player_category_select_own" on public.user_player_category_access;
drop policy if exists "user_player_category_admin_write" on public.user_player_category_access;

create policy "user_player_category_select_own"
  on public.user_player_category_access for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_current_user_admin()
  );

create policy "user_player_category_admin_insert"
  on public.user_player_category_access for insert
  to authenticated
  with check (public.is_current_user_admin());

create policy "user_player_category_admin_update"
  on public.user_player_category_access for update
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

create policy "user_player_category_admin_delete"
  on public.user_player_category_access for delete
  to authenticated
  using (public.is_current_user_admin());

create or replace function public.get_my_player_categories()
returns table (category_key text)
language sql
security definer
set search_path = public
stable
as $$
  select upca.category_key
  from public.user_player_category_access upca
  where upca.user_id = auth.uid() and upca.can_view = true;
$$;

grant execute on function public.get_my_player_categories() to authenticated;

-- Conserver l'accès Statistiques pour les utilisateurs personnalisés qui avaient Rapports
insert into public.user_permissions (user_id, module_key, can_view, can_edit, updated_at)
select user_id, 'statistics', can_view, can_edit, now()
from public.user_permissions
where module_key = 'reports'
on conflict (user_id, module_key) do nothing;

notify pgrst, 'reload schema';

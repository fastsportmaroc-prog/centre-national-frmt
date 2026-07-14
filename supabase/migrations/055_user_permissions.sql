-- 055_user_permissions.sql
-- Permissions par utilisateur et par rubrique (couche supplémentaire aux rôles existants).

create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_key text not null,
  can_view boolean not null default false,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, module_key),
  constraint user_permissions_module_key_check check (
    module_key in (
      'dashboard', 'players', 'coaches', 'stages', 'planning',
      'accommodation', 'catering', 'courts', 'equipment', 'documents',
      'budgets', 'passports_visas', 'history', 'reports', 'settings'
    )
  )
);

create index if not exists user_permissions_user_id_idx on public.user_permissions (user_id);

alter table public.user_permissions enable row level security;

drop policy if exists "user_permissions_select_own" on public.user_permissions;
drop policy if exists "user_permissions_insert_admin" on public.user_permissions;
drop policy if exists "user_permissions_update_admin" on public.user_permissions;
drop policy if exists "user_permissions_delete_admin" on public.user_permissions;

-- Lecture : ses propres permissions ou admin
create policy "user_permissions_select_own"
  on public.user_permissions for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_current_user_admin()
  );

-- Écriture : admin uniquement
create policy "user_permissions_insert_admin"
  on public.user_permissions for insert
  to authenticated
  with check (public.is_current_user_admin());

create policy "user_permissions_update_admin"
  on public.user_permissions for update
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

create policy "user_permissions_delete_admin"
  on public.user_permissions for delete
  to authenticated
  using (public.is_current_user_admin());

-- Retourne les permissions de l'utilisateur connecté
create or replace function public.get_my_permissions()
returns table (
  module_key text,
  can_view boolean,
  can_edit boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select up.module_key, up.can_view, up.can_edit
  from public.user_permissions up
  where up.user_id = auth.uid();
$$;

-- Vérifie si l'utilisateur courant peut consulter un module
create or replace function public.user_can_view_module(p_module_key text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_has_custom boolean;
  v_can_view boolean;
begin
  if public.is_current_user_admin() then
    return true;
  end if;

  select exists (
    select 1 from public.user_permissions where user_id = auth.uid()
  ) into v_has_custom;

  if not v_has_custom then
    return true;
  end if;

  select up.can_view into v_can_view
  from public.user_permissions up
  where up.user_id = auth.uid() and up.module_key = p_module_key;

  return coalesce(v_can_view, false);
end;
$$;

-- Admin : liste les permissions d'un utilisateur
create or replace function public.admin_list_user_permissions(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  module_key text,
  can_view boolean,
  can_edit boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select up.id, up.user_id, up.module_key, up.can_view, up.can_edit, up.created_at, up.updated_at
  from public.user_permissions up
  where up.user_id = p_user_id
  order by up.module_key;
end;
$$;

-- Admin : remplace toutes les permissions d'un utilisateur
create or replace function public.admin_upsert_user_permissions(
  p_user_id uuid,
  p_permissions jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
begin
  if not public.is_current_user_admin() then
    raise exception 'forbidden';
  end if;

  delete from public.user_permissions where user_id = p_user_id;

  for v_item in select * from jsonb_array_elements(p_permissions)
  loop
    insert into public.user_permissions (user_id, module_key, can_view, can_edit, updated_at)
    values (
      p_user_id,
      v_item->>'module_key',
      coalesce((v_item->>'can_view')::boolean, false),
      coalesce((v_item->>'can_edit')::boolean, false),
      now()
    );
  end loop;
end;
$$;

grant execute on function public.get_my_permissions() to authenticated;
grant execute on function public.user_can_view_module(text) to authenticated;
grant execute on function public.admin_list_user_permissions(uuid) to authenticated;
grant execute on function public.admin_upsert_user_permissions(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';

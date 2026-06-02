-- 053_profiles_admin_rpc.sql
-- Permet de gérer la liste/édition des profiles admin sans dépendre de SUPABASE_SERVICE_ROLE_KEY.

create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        lower(coalesce(p.role, '')) = 'admin'
        or lower(coalesce(p.frmt_role, '')) = 'admin'
      )
  );
$$;

create or replace function public.admin_list_profiles()
returns table (
  id uuid,
  email text,
  nom text,
  prenom text,
  full_name text,
  role text,
  entraineur_id uuid,
  actif boolean,
  created_at timestamptz
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
  select
    p.id,
    p.email,
    p.nom,
    p.prenom,
    p.full_name,
    p.role,
    p.entraineur_id,
    p.actif,
    p.created_at
  from public.profiles p
  order by p.created_at desc;
end;
$$;

create or replace function public.admin_update_profile_access(
  p_id uuid,
  p_patch jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_user_admin() then
    raise exception 'forbidden';
  end if;

  update public.profiles
  set
    role = case
      when p_patch ? 'role' then nullif(p_patch->>'role', '')
      else role
    end,
    entraineur_id = case
      when p_patch ? 'entraineur_id' then nullif(p_patch->>'entraineur_id', '')::uuid
      else entraineur_id
    end,
    actif = case
      when p_patch ? 'actif' then coalesce((p_patch->>'actif')::boolean, actif)
      else actif
    end
  where id = p_id;
end;
$$;

grant execute on function public.is_current_user_admin() to authenticated;
grant execute on function public.admin_list_profiles() to authenticated;
grant execute on function public.admin_update_profile_access(uuid, jsonb) to authenticated;

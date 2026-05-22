-- Reparation comptes auth FRMT (NON destructif)
-- Synchronise profils manquants + renforce ensure_my_profile

-- Profils manquants pour utilisateurs auth existants
insert into public.profiles (id, email, full_name, role, frmt_role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data->>'role', 'staff'),
  coalesce(u.raw_user_meta_data->>'frmt_role', 'directeur')
from auth.users u
where u.email is not null
  and not exists (select 1 from public.profiles p where p.id = u.id);

-- ensure_my_profile (idempotent)
create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, frmt_role)
  select
    u.id,
    u.email,
    coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    coalesce(u.raw_user_meta_data->>'role', 'staff'),
    coalesce(u.raw_user_meta_data->>'frmt_role', 'directeur')
  from auth.users u
  where u.id = auth.uid()
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    role = coalesce(public.profiles.role, excluded.role),
    frmt_role = coalesce(public.profiles.frmt_role, excluded.frmt_role);
end;
$$;

grant execute on function public.ensure_my_profile() to authenticated;

-- Admin FRMT (remplacer l email si besoin — UPDATE cible uniquement)
update public.profiles
set role = 'admin', frmt_role = 'admin'
where lower(email) = lower('s.abderrazzaq@frmt.ma');

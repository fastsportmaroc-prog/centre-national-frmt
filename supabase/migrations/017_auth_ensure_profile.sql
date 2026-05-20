-- Non destructif : permettre la création du profil manquant (utilisateur créé dans le dashboard Supabase)

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Crée le profil public.profiles si absent (auth.users existe déjà)
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
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);
end;
$$;

grant execute on function public.ensure_my_profile() to authenticated;

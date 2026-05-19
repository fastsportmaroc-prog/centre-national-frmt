-- Tennis Center Pro — Auth, profils, storage, RLS sécurisées

-- Profils utilisateurs (liés à auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Trigger : créer profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage : photos joueurs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'joueurs-photos',
  'joueurs-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "photos_public_read"
  on storage.objects for select
  using (bucket_id = 'joueurs-photos');

create policy "photos_auth_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'joueurs-photos');

create policy "photos_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'joueurs-photos');

create policy "photos_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'joueurs-photos');

-- RLS métier : utilisateurs authentifiés
drop policy if exists "allow_all_dev" on public.joueurs;
drop policy if exists "allow_all_dev" on public.courts;
drop policy if exists "allow_all_dev" on public.reservations;
drop policy if exists "allow_all_dev" on public.hebergements;
drop policy if exists "allow_all_dev" on public.repas;

create policy "joueurs_auth_all" on public.joueurs
  for all to authenticated using (true) with check (true);

create policy "courts_auth_all" on public.courts
  for all to authenticated using (true) with check (true);

create policy "reservations_auth_all" on public.reservations
  for all to authenticated using (true) with check (true);

create policy "hebergements_auth_all" on public.hebergements
  for all to authenticated using (true) with check (true);

create policy "repas_auth_all" on public.repas
  for all to authenticated using (true) with check (true);

-- Données de démo (optionnel)
insert into public.courts (nom, surface, couvert, actif)
select 'Court Central', 'Terre battue', false, true
where not exists (select 1 from public.courts limit 1);

insert into public.courts (nom, surface, couvert, actif)
select 'Court 2', 'Dur', true, true
where (select count(*) from public.courts) < 2;

-- Premier admin : après inscription, exécuter :
-- update public.profiles set role = 'admin' where email = 'votre@email.com';

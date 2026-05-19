-- Production FRMT : rôles étendus, photos entraîneurs, seed infrastructures

alter table public.profiles
  add column if not exists frmt_role text not null default 'directeur'
  check (frmt_role in ('admin', 'directeur', 'entraineur', 'logisticien', 'joueur'));

alter table public.entraineurs
  add column if not exists photo_url text;

-- Seed infrastructures Centre National (si vide)
insert into public.infrastructures (nom, type, surface, capacite, actif, statut)
select * from (values
  ('Court 1', 'terrain', 'terre_battue', 4, true, 'disponible'),
  ('Court 2', 'terrain', 'terre_battue', 4, true, 'disponible'),
  ('Court 3', 'terrain', 'terre_battue', 4, true, 'disponible'),
  ('Court 4', 'terrain', 'dur', 4, true, 'disponible'),
  ('Court 5', 'terrain', 'dur', 4, true, 'disponible'),
  ('Espace physique', 'emplacement_physique', 'indoor', 24, true, 'disponible'),
  ('Salle fitness', 'fitness', 'indoor', 20, true, 'disponible'),
  ('Salle natation', 'natation', 'indoor', 16, true, 'disponible')
) as v(nom, type, surface, capacite, actif, statut)
where not exists (select 1 from public.infrastructures limit 1);

-- Bucket photos entraîneurs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entraineurs-photos',
  'entraineurs-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "entraineurs_photos_public_read" on storage.objects;
create policy "entraineurs_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'entraineurs-photos');

drop policy if exists "entraineurs_photos_auth_write" on storage.objects;
create policy "entraineurs_photos_auth_write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'entraineurs-photos')
  with check (bucket_id = 'entraineurs-photos');

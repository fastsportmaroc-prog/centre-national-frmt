-- Bucket Storage : photos entraîneurs (à exécuter dans Supabase → SQL Editor)
-- Corrige l'erreur « Bucket not found » pour les photos coach.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'entraineurs-photos',
  'entraineurs-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "entraineurs_photos_public_read" on storage.objects;
create policy "entraineurs_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'entraineurs-photos');

drop policy if exists "entraineurs_photos_auth_insert" on storage.objects;
create policy "entraineurs_photos_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'entraineurs-photos');

drop policy if exists "entraineurs_photos_auth_update" on storage.objects;
create policy "entraineurs_photos_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'entraineurs-photos')
  with check (bucket_id = 'entraineurs-photos');

drop policy if exists "entraineurs_photos_auth_delete" on storage.objects;
create policy "entraineurs_photos_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'entraineurs-photos');

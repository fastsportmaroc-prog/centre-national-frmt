-- Documents administratifs (passeports & visas) — joueurs et entraîneurs

create table if not exists public.documents_administratifs (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('player', 'coach')),
  owner_id uuid not null,
  document_type text not null check (document_type in ('passeport', 'visa')),
  document_number text,
  country text,
  expiration_date date,
  file_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_admin_owner
  on public.documents_administratifs (owner_type, owner_id);

create index if not exists idx_documents_admin_expiration
  on public.documents_administratifs (expiration_date);

create index if not exists idx_documents_admin_type
  on public.documents_administratifs (document_type);

alter table public.documents_administratifs enable row level security;

drop policy if exists "documents_administratifs_auth" on public.documents_administratifs;
create policy "documents_administratifs_auth" on public.documents_administratifs
  for all to authenticated using (true) with check (true);

-- Bucket fichiers (PDF / images)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admin-documents',
  'admin-documents',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "admin_documents_public_read" on storage.objects;
create policy "admin_documents_public_read"
  on storage.objects for select
  using (bucket_id = 'admin-documents');

drop policy if exists "admin_documents_auth_write" on storage.objects;
create policy "admin_documents_auth_write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'admin-documents')
  with check (bucket_id = 'admin-documents');

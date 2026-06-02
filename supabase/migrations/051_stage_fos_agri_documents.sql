-- Procédure administrative FOS AGRI — PDF par stage (1 ou 2 fichiers)

create table if not exists public.stage_fos_agri_documents (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages_programme(id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  file_name text not null,
  storage_path text not null,
  file_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stage_id, slot)
);

create index if not exists idx_stage_fos_agri_stage on public.stage_fos_agri_documents(stage_id);

alter table public.stage_fos_agri_documents enable row level security;

drop policy if exists "stage_fos_agri_documents_auth" on public.stage_fos_agri_documents;
create policy "stage_fos_agri_documents_auth" on public.stage_fos_agri_documents
  for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stage-fos-agri',
  'stage-fos-agri',
  true,
  10485760,
  array['application/pdf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "stage_fos_agri_public_read" on storage.objects;
create policy "stage_fos_agri_public_read"
  on storage.objects for select
  using (bucket_id = 'stage-fos-agri');

drop policy if exists "stage_fos_agri_auth_write" on storage.objects;
create policy "stage_fos_agri_auth_write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'stage-fos-agri')
  with check (bucket_id = 'stage-fos-agri');

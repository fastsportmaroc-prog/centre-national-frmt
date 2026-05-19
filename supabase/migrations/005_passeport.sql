-- Dossiers passeport, visas et assurance voyage

create table if not exists public.dossiers_passeport (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid not null references public.joueurs(id) on delete cascade,
  numero_passeport text,
  pays_emission text,
  date_emission date,
  date_expiration date,
  image_passeport_url text,
  visas jsonb not null default '[]'::jsonb,
  assurance jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (joueur_id)
);

alter table public.dossiers_passeport enable row level security;

create policy "dossiers_passeport_auth" on public.dossiers_passeport
  for all to authenticated using (true) with check (true);

create index if not exists idx_dossiers_passeport_joueur on public.dossiers_passeport(joueur_id);

-- Bucket storage (à créer dans Supabase Dashboard si besoin)
-- insert into storage.buckets (id, name, public) values ('passeport-documents', 'passeport-documents', true);

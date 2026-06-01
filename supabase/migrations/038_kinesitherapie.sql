-- Kinésithérapie : séances joueurs + liaison stages

alter table public.stages_programme
  add column if not exists kinesitherapie boolean not null default false;

create table if not exists public.kinesitherapie_seances (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid not null references public.joueurs(id) on delete cascade,
  date_seance date not null,
  duree_minutes integer,
  motif text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_kine_seances_joueur on public.kinesitherapie_seances(joueur_id);
create index if not exists idx_kine_seances_date on public.kinesitherapie_seances(date_seance);

create table if not exists public.kinesitherapie_stages (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages_programme(id) on delete cascade,
  actif boolean not null default true,
  date_debut date,
  date_fin date,
  remarques text,
  statut text not null default 'prevu',
  created_at timestamptz not null default now(),
  unique (stage_id)
);

create table if not exists public.kinesitherapie_stage_participants (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages_programme(id) on delete cascade,
  personne_id uuid not null,
  personne_type text not null check (personne_type in ('joueur', 'entraineur')),
  auto_from_seance boolean not null default false,
  created_at timestamptz not null default now(),
  unique (stage_id, personne_id, personne_type)
);

create index if not exists idx_kine_stage_participants_stage
  on public.kinesitherapie_stage_participants(stage_id);

alter table public.kinesitherapie_seances enable row level security;
alter table public.kinesitherapie_stages enable row level security;
alter table public.kinesitherapie_stage_participants enable row level security;

drop policy if exists "kinesitherapie_seances_auth_all" on public.kinesitherapie_seances;
drop policy if exists "kinesitherapie_stages_auth_all" on public.kinesitherapie_stages;
drop policy if exists "kinesitherapie_stage_participants_auth_all" on public.kinesitherapie_stage_participants;

create policy "kinesitherapie_seances_auth_all" on public.kinesitherapie_seances
  for all to authenticated using (true) with check (true);

create policy "kinesitherapie_stages_auth_all" on public.kinesitherapie_stages
  for all to authenticated using (true) with check (true);

create policy "kinesitherapie_stage_participants_auth_all" on public.kinesitherapie_stage_participants
  for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';

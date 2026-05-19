-- Liens stages + réservations multi-infrastructures

alter table public.stages_programme
  add column if not exists statut text not null default 'prevu',
  add column if not exists infrastructure_ids text[] not null default '{}',
  add column if not exists entraineur_ids text[] not null default '{}',
  add column if not exists materiel_assignations jsonb not null default '[]'::jsonb;

create table if not exists public.reservations_infrastructure (
  id uuid primary key default gen_random_uuid(),
  infrastructure_id uuid not null references public.infrastructures(id) on delete cascade,
  date_debut timestamptz not null,
  date_fin timestamptz not null,
  statut text not null default 'confirmee',
  joueur_id uuid references public.joueurs(id) on delete set null,
  groupe_id uuid references public.groupes(id) on delete set null,
  stage_id uuid references public.stages_programme(id) on delete set null,
  entraineur_id uuid references public.entraineurs(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reservations_infra_dates on public.reservations_infrastructure(infrastructure_id, date_debut, date_fin);
create index if not exists idx_stages_programme_statut on public.stages_programme(statut);

alter table public.reservations_infrastructure enable row level security;

-- Entraîneurs, missions, dépenses, disponibilités + budget annuel

create table if not exists public.entraineurs (
  id uuid primary key default gen_random_uuid(),
  prenom text not null,
  nom text not null,
  email text,
  telephone text,
  specialite text,
  licence_fft text,
  statut text not null default 'actif',
  groupe_ids text[] not null default '{}',
  budget_voyages_annuel numeric(12, 2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.missions_entraineur (
  id uuid primary key default gen_random_uuid(),
  entraineur_id uuid not null references public.entraineurs(id) on delete cascade,
  stage_id uuid references public.stages_programme(id) on delete set null,
  titre text not null,
  lieu text,
  date_debut date not null,
  date_fin date not null,
  type_mission text not null default 'stage',
  statut text not null default 'planifie',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.entraineur_depenses (
  id uuid primary key default gen_random_uuid(),
  entraineur_id uuid not null references public.entraineurs(id) on delete cascade,
  date_depense date not null,
  categorie text not null,
  libelle text not null,
  montant numeric(12, 2) not null,
  devise text not null default 'MAD',
  mission_id uuid references public.missions_entraineur(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.disponibilites_entraineur (
  id uuid primary key default gen_random_uuid(),
  entraineur_id uuid not null references public.entraineurs(id) on delete cascade,
  date date not null,
  disponible boolean not null default true,
  motif text,
  unique (entraineur_id, date)
);

create table if not exists public.budget_annuel (
  id uuid primary key default gen_random_uuid(),
  annee int not null,
  categorie text not null,
  libelle text not null,
  montant_alloue numeric(14, 2) not null default 0,
  montant_engage numeric(14, 2) not null default 0,
  montant_reel numeric(14, 2) not null default 0,
  devise text not null default 'MAD',
  notes text,
  updated_at timestamptz not null default now(),
  unique (annee, categorie)
);

create index if not exists idx_missions_entraineur_dates on public.missions_entraineur(date_debut, date_fin);
create index if not exists idx_entraineur_depenses_date on public.entraineur_depenses(date_depense);
create index if not exists idx_budget_annuel_annee on public.budget_annuel(annee);

alter table public.entraineurs enable row level security;
alter table public.missions_entraineur enable row level security;
alter table public.entraineur_depenses enable row level security;
alter table public.disponibilites_entraineur enable row level security;
alter table public.budget_annuel enable row level security;

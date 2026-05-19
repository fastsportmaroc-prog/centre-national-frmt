-- Calendrier CNE + Occupation (import Excel FRMT)

create table if not exists public.stages_programme (
  id uuid primary key default gen_random_uuid(),
  id_excel text,
  source text not null default 'FRMT',
  categorie text not null,
  stage_action text not null,
  date_debut date not null,
  date_fin date not null,
  nombre_joueurs int not null default 0,
  nombre_encadrants int not null default 0,
  hebergement boolean not null default true,
  chambres int not null default 0,
  lieu text,
  notes text,
  budget_prevu numeric(12, 2),
  budget_reel numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.occupation_cne (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  pavillon int not null default 0,
  numero_chambre int not null default 0,
  type_chambre text not null,
  capacite int not null default 1,
  occupants int not null default 0,
  stage_id uuid references public.stages_programme(id) on delete set null,
  stage_id_excel text,
  stage_libelle text,
  categorie text,
  taux_occupation_pct numeric(6, 2) not null default 0,
  alerte text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stages_programme_dates on public.stages_programme(date_debut, date_fin);
create index if not exists idx_occupation_cne_date on public.occupation_cne(date);

alter table public.stages_programme enable row level security;
alter table public.occupation_cne enable row level security;

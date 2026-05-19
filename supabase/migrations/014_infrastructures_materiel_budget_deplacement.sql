-- Infrastructures, matériel et budget déplacement joueur

create table if not exists public.infrastructures (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type text not null,
  surface text not null default 'autre',
  capacite int not null default 0,
  actif boolean not null default true,
  statut text not null default 'disponible',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.infrastructure_usages (
  id uuid primary key default gen_random_uuid(),
  infrastructure_id uuid not null references public.infrastructures(id) on delete cascade,
  date_debut timestamptz not null,
  date_fin timestamptz not null,
  module text not null,
  reference_id text,
  commentaire text
);

create table if not exists public.materiels (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  categorie text not null,
  quantite_totale int not null default 0,
  quantite_disponible int not null default 0,
  quantite_utilisee int not null default 0,
  seuil_alerte int not null default 0,
  etat text not null default 'disponible',
  emplacement text,
  fournisseur text,
  prix_unitaire numeric(12, 2),
  notes text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mouvements_materiel (
  id uuid primary key default gen_random_uuid(),
  materiel_id uuid not null references public.materiels(id) on delete cascade,
  stage_id uuid references public.stages_programme(id) on delete set null,
  type_mouvement text not null,
  quantite int not null,
  commentaire text,
  created_at timestamptz not null default now()
);

create table if not exists public.budget_deplacement (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid not null references public.joueurs(id) on delete cascade,
  coach_id uuid references public.entraineurs(id) on delete set null,
  tournoi text not null,
  destination text not null,
  date_depart date not null,
  date_retour date not null,
  avec_coach boolean not null default false,
  devise text not null default 'MAD',
  statut text not null default 'brouillon',
  total_previsionnel numeric(14, 2) not null default 0,
  total_reel numeric(14, 2) not null default 0,
  valide_par text,
  date_validation timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lignes_budget_deplacement (
  id uuid primary key default gen_random_uuid(),
  budget_deplacement_id uuid not null references public.budget_deplacement(id) on delete cascade,
  joueur_id uuid not null references public.joueurs(id) on delete cascade,
  categorie text not null,
  description text not null,
  quantite numeric(12, 2) not null default 1,
  prix_unitaire numeric(12, 2) not null default 0,
  montant_total numeric(14, 2) not null default 0,
  devise text not null default 'MAD',
  type text not null default 'previsionnel',
  impute_joueur boolean not null default true,
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_infrastructures_type on public.infrastructures(type);
create index if not exists idx_materiels_categorie on public.materiels(categorie);
create index if not exists idx_budget_deplacement_joueur on public.budget_deplacement(joueur_id);
create index if not exists idx_lignes_budget_deplacement_budget on public.lignes_budget_deplacement(budget_deplacement_id);

alter table public.infrastructures enable row level security;
alter table public.infrastructure_usages enable row level security;
alter table public.materiels enable row level security;
alter table public.mouvements_materiel enable row level security;
alter table public.budget_deplacement enable row level security;
alter table public.lignes_budget_deplacement enable row level security;

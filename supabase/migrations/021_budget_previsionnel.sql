-- Budget prévisionnel FRMT — migration NON destructive (à appliquer manuellement en local)
-- CREATE IF NOT EXISTS uniquement — aucun DROP / TRUNCATE / DELETE

create table if not exists public.budgets_previsionnel (
  id uuid primary key default gen_random_uuid(),
  objet text not null,
  type_budget text not null default 'mission',
  sujet_libelle text not null default '',
  avec_coach boolean not null default false,
  coach_nom text,
  tournoi_evenement text,
  pays text,
  ville text,
  date_debut date not null,
  date_fin date not null,
  nombre_personnes int not null default 1,
  devise text not null default 'EUR',
  taux_mad numeric(10, 4) not null default 10.80,
  statut text not null default 'brouillon',
  joueur_id uuid references public.joueurs(id) on delete set null,
  entraineur_id uuid references public.entraineurs(id) on delete set null,
  stage_id uuid references public.stages_programme(id) on delete set null,
  equipe_libelle text,
  sous_total_eur numeric(14, 2) not null default 0,
  total_eur numeric(14, 2) not null default 0,
  total_mad numeric(14, 2) not null default 0,
  montant_lettres_mad text,
  lignes jsonb not null default '[]'::jsonb,
  signataires jsonb not null default '[]'::jsonb,
  participants jsonb not null default '{"joueur_ids":[],"coach_ids":[]}'::jsonb,
  dernier_export_pdf_at timestamptz,
  created_by text not null default 'system',
  updated_by text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_previsionnel_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets_previsionnel(id) on delete cascade,
  designation text not null,
  description text,
  quantite numeric(12, 2) not null default 1,
  jours_nuits numeric(12, 2) not null default 1,
  prix_unitaire_eur numeric(14, 2) not null default 0,
  total_eur numeric(14, 2) not null default 0,
  remarques text,
  ordre int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.budget_previsionnel_signatories (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets_previsionnel(id) on delete cascade,
  poste text not null,
  nom text not null default '',
  ordre int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.budget_previsionnel_history (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid references public.budgets_previsionnel(id) on delete set null,
  action text not null,
  utilisateur text not null default 'system',
  details text,
  created_at timestamptz not null default now()
);

create index if not exists idx_budgets_previsionnel_statut on public.budgets_previsionnel(statut);
create index if not exists idx_budgets_previsionnel_dates on public.budgets_previsionnel(date_debut, date_fin);
create index if not exists idx_budgets_previsionnel_joueur on public.budgets_previsionnel(joueur_id);
create index if not exists idx_budgets_previsionnel_stage on public.budgets_previsionnel(stage_id);

alter table public.budgets_previsionnel enable row level security;
alter table public.budget_previsionnel_lines enable row level security;
alter table public.budget_previsionnel_signatories enable row level security;
alter table public.budget_previsionnel_history enable row level security;

drop policy if exists "budgets_previsionnel_auth" on public.budgets_previsionnel;
create policy "budgets_previsionnel_auth" on public.budgets_previsionnel
  for all to authenticated using (true) with check (true);

drop policy if exists "budget_previsionnel_lines_auth" on public.budget_previsionnel_lines;
create policy "budget_previsionnel_lines_auth" on public.budget_previsionnel_lines
  for all to authenticated using (true) with check (true);

drop policy if exists "budget_previsionnel_signatories_auth" on public.budget_previsionnel_signatories;
create policy "budget_previsionnel_signatories_auth" on public.budget_previsionnel_signatories
  for all to authenticated using (true) with check (true);

drop policy if exists "budget_previsionnel_history_auth" on public.budget_previsionnel_history;
create policy "budget_previsionnel_history_auth" on public.budget_previsionnel_history
  for all to authenticated using (true) with check (true);

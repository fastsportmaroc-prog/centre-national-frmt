-- Classements ATP/WTA marocains (scrape hebdomadaire) — historique par semaine
-- Séparé de classements_externes (RapidAPI / joueurs CNE)

create table if not exists public.classements_maroc_scrapes (
  id uuid primary key default gen_random_uuid(),
  nom_joueur text not null,
  type_classement text not null check (type_classement in ('ATP', 'WTA')),
  genre text not null check (genre in ('M', 'F')),
  rang int not null check (rang > 0),
  points numeric,
  evolution int,
  age int,
  semaine_releve date not null,
  date_releve timestamptz not null default now(),
  source_url text not null,
  source_player_id text,
  joueur_cne_id uuid references public.joueurs (id) on delete set null,
  est_membre_cne boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists classements_maroc_scrapes_semaine_idx
  on public.classements_maroc_scrapes (semaine_releve desc, type_classement, rang);

create index if not exists classements_maroc_scrapes_joueur_cne_idx
  on public.classements_maroc_scrapes (joueur_cne_id)
  where joueur_cne_id is not null;

create unique index if not exists classements_maroc_scrapes_unique_releve
  on public.classements_maroc_scrapes (type_classement, source_player_id, semaine_releve)
  where source_player_id is not null;

create unique index if not exists classements_maroc_scrapes_unique_nom_releve
  on public.classements_maroc_scrapes (type_classement, nom_joueur, semaine_releve)
  where source_player_id is null;

alter table public.classements_maroc_scrapes enable row level security;

drop policy if exists "classements_maroc_scrapes_select_auth" on public.classements_maroc_scrapes;
create policy "classements_maroc_scrapes_select_auth"
  on public.classements_maroc_scrapes
  for select
  to authenticated
  using (true);

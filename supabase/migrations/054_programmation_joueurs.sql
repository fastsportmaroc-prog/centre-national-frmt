-- Module Programmation Joueurs (tables dédiées — sans modification des tables existantes)

create table if not exists public.programmation_evenements (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid not null references public.joueurs(id) on delete cascade,
  type text not null check (
    type in (
      'tournoi_itf',
      'tournoi_atp_wta',
      'coupe_davis',
      'bjk_cup',
      'stage_national',
      'stage_etranger',
      'competition_nationale',
      'blessure',
      'repos',
      'autre'
    )
  ),
  nom varchar(255) not null,
  pays varchar(100),
  ville varchar(100),
  date_debut date not null,
  date_fin date not null,
  surface text check (
    surface is null
    or surface in ('dur', 'terre_battue', 'gazon', 'indoor', 'synthetique')
  ),
  altitude integer,
  categorie_tournoi varchar(100),
  dotation_usd numeric(12, 2),
  points_gain_vainqueur integer,
  tableau text check (
    tableau is null or tableau in ('simple', 'double', 'les_deux')
  ),
  wild_card boolean not null default false,
  classement_requis integer,
  site_officiel varchar(500),
  statut text not null default 'a_venir' check (
    statut in ('a_venir', 'en_cours', 'termine')
  ),
  resultat_simple varchar(100),
  resultat_double varchar(100),
  points_gagnes integer,
  prize_money_usd numeric(12, 2),
  notes_coach text,
  billet_avion_id uuid,
  hebergement_id uuid,
  visa_requis boolean not null default false,
  per_diem_prevu numeric(10, 2),
  competition_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programmation_evenements_dates check (date_fin >= date_debut)
);

create index if not exists idx_prog_joueur on public.programmation_evenements (joueur_id);
create index if not exists idx_prog_dates on public.programmation_evenements (date_debut, date_fin);
create index if not exists idx_prog_type on public.programmation_evenements (type);
create index if not exists idx_prog_statut on public.programmation_evenements (statut);

alter table public.programmation_evenements enable row level security;

drop policy if exists "programmation_evenements_all" on public.programmation_evenements;
create policy "programmation_evenements_all" on public.programmation_evenements
  for all using (true) with check (true);

comment on table public.programmation_evenements is 'Programme tournois/stages/repos par joueur — module Programmation Joueurs';

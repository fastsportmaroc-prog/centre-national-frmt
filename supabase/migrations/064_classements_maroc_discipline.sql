-- Discipline simple / double pour classements ATP/WTA marocains
-- Les relevés déjà scrapés = simple ; double à venir.

alter table public.classements_maroc_scrapes
  add column if not exists discipline text not null default 'simple'
  check (discipline in ('simple', 'double'));

comment on column public.classements_maroc_scrapes.discipline is
  'Tableau : simple (singles) ou double — scrapes actuels = simple';

drop index if exists public.classements_maroc_scrapes_unique_releve;
drop index if exists public.classements_maroc_scrapes_unique_nom_releve;

create unique index if not exists classements_maroc_scrapes_unique_releve
  on public.classements_maroc_scrapes (type_classement, discipline, source_player_id, semaine_releve)
  where source_player_id is not null;

create unique index if not exists classements_maroc_scrapes_unique_nom_releve
  on public.classements_maroc_scrapes (type_classement, discipline, nom_joueur, semaine_releve)
  where source_player_id is null;

create index if not exists classements_maroc_scrapes_discipline_idx
  on public.classements_maroc_scrapes (semaine_releve desc, discipline, type_classement, rang);

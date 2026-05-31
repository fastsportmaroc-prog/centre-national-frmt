-- Pivot participants stage : FK vers stages_programme + entraineurs (app V2)
-- Corrige : violates foreign key constraint "stage_coachs_stage_id_fkey"

create table if not exists public.stage_joueurs (
  stage_id uuid not null,
  joueur_id uuid not null,
  primary key (stage_id, joueur_id)
);

create table if not exists public.stage_coachs (
  stage_id uuid not null,
  coach_id uuid not null,
  primary key (stage_id, coach_id)
);

-- Supprimer les liens orphelins (anciennes tables stages / coachs)
delete from public.stage_joueurs sj
where not exists (select 1 from public.stages_programme sp where sp.id = sj.stage_id);

delete from public.stage_coachs sc
where not exists (select 1 from public.stages_programme sp where sp.id = sc.stage_id);

delete from public.stage_coachs sc
where not exists (select 1 from public.entraineurs e where e.id = sc.coach_id);

alter table public.stage_joueurs drop constraint if exists stage_joueurs_stage_id_fkey;
alter table public.stage_joueurs drop constraint if exists stage_joueurs_joueur_id_fkey;
alter table public.stage_coachs drop constraint if exists stage_coachs_stage_id_fkey;
alter table public.stage_coachs drop constraint if exists stage_coachs_coach_id_fkey;

alter table public.stage_joueurs
  add constraint stage_joueurs_stage_id_fkey
  foreign key (stage_id) references public.stages_programme(id) on delete cascade;

alter table public.stage_joueurs
  add constraint stage_joueurs_joueur_id_fkey
  foreign key (joueur_id) references public.joueurs(id) on delete cascade;

alter table public.stage_coachs
  add constraint stage_coachs_stage_id_fkey
  foreign key (stage_id) references public.stages_programme(id) on delete cascade;

alter table public.stage_coachs
  add constraint stage_coachs_coach_id_fkey
  foreign key (coach_id) references public.entraineurs(id) on delete cascade;

alter table public.stage_joueurs enable row level security;
alter table public.stage_coachs enable row level security;

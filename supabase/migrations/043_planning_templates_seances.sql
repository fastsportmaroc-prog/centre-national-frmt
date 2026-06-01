-- 043_planning_templates_seances.sql
-- Idempotent migration for planning template/seance model.

create table if not exists public.planning_templates (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  label text not null,
  description text,
  actif boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seances (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages_programme(id) on delete cascade,
  date_seance date not null,
  heure_debut time not null,
  heure_fin time not null,
  creneau text generated always as (
    case when heure_debut < time '13:00' then 'matin' else 'apres_midi' end
  ) stored,
  infrastructure_id uuid null references public.infrastructures(id) on delete set null,
  surface text,
  coach_id uuid null references public.entraineurs(id) on delete set null,
  groupe text,
  statut text not null default 'prevu',
  planning_template_id uuid null references public.planning_templates(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_seances_stage_date on public.seances(stage_id, date_seance);
create index if not exists idx_seances_infra_date on public.seances(infrastructure_id, date_seance);

create table if not exists public.seance_presences (
  id uuid primary key default gen_random_uuid(),
  seance_id uuid not null references public.seances(id) on delete cascade,
  personne_id uuid not null,
  personne_type text not null check (personne_type in ('joueur', 'entraineur')),
  present boolean not null default true,
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seance_id, personne_id, personne_type)
);

create index if not exists idx_seance_presences_seance on public.seance_presences(seance_id);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_planning_templates_updated_at on public.planning_templates;
create trigger trg_planning_templates_updated_at
before update on public.planning_templates
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_seances_updated_at on public.seances;
create trigger trg_seances_updated_at
before update on public.seances
for each row execute function public.set_updated_at_timestamp();

drop trigger if exists trg_seance_presences_updated_at on public.seance_presences;
create trigger trg_seance_presences_updated_at
before update on public.seance_presences
for each row execute function public.set_updated_at_timestamp();

insert into public.planning_templates (code, label, description, payload)
values
  (
    'default_stage',
    'Template standard stage',
    '1 séance matin par jour de stage',
    '{"slots":[{"creneau":"matin","heure_debut":"09:00","heure_fin":"13:00"}]}'::jsonb
  ),
  (
    'double_daily_stage',
    'Template double séance',
    'Séances matin + après-midi',
    '{"slots":[{"creneau":"matin","heure_debut":"09:00","heure_fin":"13:00"},{"creneau":"apres_midi","heure_debut":"14:00","heure_fin":"18:00"}]}'::jsonb
  )
on conflict (code) do update
set
  label = excluded.label,
  description = excluded.description,
  payload = excluded.payload,
  actif = true;

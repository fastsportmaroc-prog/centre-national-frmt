-- Hébergement / restauration par participant (fiche stage V2)

create table if not exists public.stage_hebergement (
  id         uuid primary key default gen_random_uuid(),
  stage_id   uuid not null references public.stages_programme(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (stage_id)
);

create table if not exists public.stage_hebergement_participants (
  id               uuid primary key default gen_random_uuid(),
  stage_id         uuid not null references public.stages_programme(id) on delete cascade,
  participant_id   uuid not null,
  participant_type text not null check (participant_type in ('joueur', 'coach')),
  heberge          boolean not null default true,
  date_arrivee     date,
  date_depart      date,
  chambre_id       uuid,
  statut           text not null default 'confirmé'
    check (statut in ('confirmé', 'en attente', 'annulé')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (stage_id, participant_id, participant_type)
);

create table if not exists public.stage_restauration_jours (
  id              uuid primary key default gen_random_uuid(),
  stage_id        uuid not null references public.stages_programme(id) on delete cascade,
  date            date not null,
  petit_dejeuner  boolean not null default true,
  dejeuner        boolean not null default true,
  diner           boolean not null default true,
  is_default      boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (stage_id, date)
);

create table if not exists public.stage_restauration_participants (
  id               uuid primary key default gen_random_uuid(),
  stage_id         uuid not null references public.stages_programme(id) on delete cascade,
  participant_id   uuid not null,
  participant_type text not null check (participant_type in ('joueur', 'coach')),
  date             date not null,
  petit_dejeuner   boolean,
  dejeuner         boolean,
  diner            boolean,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (stage_id, participant_id, participant_type, date)
);

create index if not exists idx_heberg_part_stage
  on public.stage_hebergement_participants (stage_id);
create index if not exists idx_heberg_part_person
  on public.stage_hebergement_participants (participant_id, participant_type);
create index if not exists idx_resto_jours_stage
  on public.stage_restauration_jours (stage_id, date);
create index if not exists idx_resto_part_stage
  on public.stage_restauration_participants (stage_id, date);

alter table public.stage_hebergement enable row level security;
alter table public.stage_hebergement_participants enable row level security;
alter table public.stage_restauration_jours enable row level security;
alter table public.stage_restauration_participants enable row level security;

drop policy if exists "stage_hebergement_all" on public.stage_hebergement;
create policy "stage_hebergement_all" on public.stage_hebergement for all using (true) with check (true);

drop policy if exists "stage_hebergement_participants_all" on public.stage_hebergement_participants;
create policy "stage_hebergement_participants_all" on public.stage_hebergement_participants for all using (true) with check (true);

drop policy if exists "stage_restauration_jours_all" on public.stage_restauration_jours;
create policy "stage_restauration_jours_all" on public.stage_restauration_jours for all using (true) with check (true);

drop policy if exists "stage_restauration_participants_all" on public.stage_restauration_participants;
create policy "stage_restauration_participants_all" on public.stage_restauration_participants for all using (true) with check (true);

-- Backfill joueurs
insert into public.stage_hebergement_participants (
  stage_id, participant_id, participant_type, heberge, date_arrivee, date_depart
)
select
  sj.stage_id,
  sj.joueur_id,
  'joueur',
  true,
  s.date_debut::date,
  s.date_fin::date
from public.stage_joueurs sj
join public.stages_programme s on s.id = sj.stage_id
on conflict (stage_id, participant_id, participant_type) do nothing;

-- Backfill coachs
insert into public.stage_hebergement_participants (
  stage_id, participant_id, participant_type, heberge, date_arrivee, date_depart
)
select
  sc.stage_id,
  sc.coach_id,
  'coach',
  true,
  s.date_debut::date,
  s.date_fin::date
from public.stage_coachs sc
join public.stages_programme s on s.id = sc.stage_id
on conflict (stage_id, participant_id, participant_type) do nothing;

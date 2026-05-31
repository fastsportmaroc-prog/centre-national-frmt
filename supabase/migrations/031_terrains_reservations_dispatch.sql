-- ══════════════════════════════════════════
-- TABLE TERRAINS (si pas encore créée)
-- ══════════════════════════════════════════
create table if not exists public.terrains (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  type        text not null,
  surface     text,
  capacite    integer default 4,
  actif       boolean default true,
  ordre       integer default 0,
  created_at  timestamptz default now()
);

-- ══════════════════════════════════════════
-- TABLE RÉSERVATIONS TERRAIN PAR STAGE
-- ══════════════════════════════════════════
create table if not exists public.terrain_reservations (
  id            uuid primary key default gen_random_uuid(),
  terrain_id    uuid references public.terrains(id) on delete cascade,
  stage_id      uuid references public.stages_programme(id) on delete cascade,
  date_debut    date not null,
  date_fin      date not null,
  creneau       text not null
                check (creneau in ('matin','apres-midi','journee')),
  mode          text not null default 'stage'
                check (mode in ('stage','dispatch')),
  statut        text not null default 'confirme'
                check (statut in ('confirme','annule','en-attente')),
  notes         text,
  created_at    timestamptz default now(),
  unique (terrain_id, stage_id, creneau, date_debut)
);

-- ══════════════════════════════════════════
-- TABLE DISPATCH JOUEURS SUR TERRAIN
-- ══════════════════════════════════════════
create table if not exists public.terrain_dispatch (
  id              uuid primary key default gen_random_uuid(),
  reservation_id  uuid references public.terrain_reservations(id) on delete cascade,
  joueur_id       uuid references public.joueurs(id) on delete cascade,
  stage_id        uuid references public.stages_programme(id) on delete cascade,
  terrain_id      uuid references public.terrains(id) on delete cascade,
  date_debut      date,
  date_fin        date,
  creneau         text,
  created_at      timestamptz default now(),
  unique (joueur_id, stage_id, terrain_id, creneau)
);

-- ══════════════════════════════════════════
-- VUE OCCUPATION 30 JOURS GLISSANTS
-- ══════════════════════════════════════════
create or replace view public.v_occupation_terrains as
select
  t.id,
  t.nom,
  t.type,
  t.surface,
  t.capacite,
  t.ordre,
  count(distinct r.stage_id)                        as nb_stages,
  count(distinct r.id)                              as nb_reservations,
  count(distinct case when r.creneau = 'matin'
        then r.date_debut end)                      as jours_matin,
  count(distinct case when r.creneau = 'apres-midi'
        then r.date_debut end)                      as jours_aprem,
  count(distinct case when r.creneau = 'journee'
        then r.date_debut end)                      as jours_journee,
  -- Taux sur 30 jours (2 créneaux/jour max)
  round(
    count(distinct r.id) * 100.0 / nullif(30 * 2, 0)
  , 1)                                              as taux_occupation_pct,
  min(r.date_debut)                                 as prochaine_resa
from public.terrains t
left join public.terrain_reservations r
  on  r.terrain_id = t.id
  and r.statut     = 'confirme'
  and r.date_debut >= current_date
  and r.date_debut <= current_date + interval '30 days'
where t.actif = true
group by t.id, t.nom, t.type, t.surface, t.capacite, t.ordre
order by t.ordre;

-- ══════════════════════════════════════════
-- VUE CALENDRIER COMPLET TERRAINS
-- ══════════════════════════════════════════
create or replace view public.v_calendrier_terrains as
select
  r.id                  as reservation_id,
  r.terrain_id,
  t.nom                 as terrain_nom,
  t.type                as terrain_type,
  t.surface             as terrain_surface,
  r.stage_id,
  s.stage_action        as stage_nom,
  s.categorie           as stage_categorie,
  s.statut              as stage_statut,
  r.date_debut,
  r.date_fin,
  r.creneau,
  r.mode,
  r.statut              as resa_statut,
  count(d.id)           as nb_joueurs_dispatches
from public.terrain_reservations r
join public.terrains t on t.id = r.terrain_id
join public.stages_programme s on s.id = r.stage_id
left join public.terrain_dispatch d on d.reservation_id = r.id
group by
  r.id, r.terrain_id, t.nom, t.type, t.surface,
  r.stage_id, s.stage_action, s.categorie, s.statut,
  r.date_debut, r.date_fin, r.creneau, r.mode, r.statut
order by r.date_debut, t.ordre;

-- ══════════════════════════════════════════
-- POLITIQUES RLS
-- ══════════════════════════════════════════
alter table public.terrains              enable row level security;
alter table public.terrain_reservations  enable row level security;
alter table public.terrain_dispatch      enable row level security;

drop policy if exists "Accès authentifié terrains" on public.terrains;
create policy "Accès authentifié terrains"
  on public.terrains for all
  using (auth.role() = 'authenticated');

drop policy if exists "Accès authentifié reservations" on public.terrain_reservations;
create policy "Accès authentifié reservations"
  on public.terrain_reservations for all
  using (auth.role() = 'authenticated');

drop policy if exists "Accès authentifié dispatch" on public.terrain_dispatch;
create policy "Accès authentifié dispatch"
  on public.terrain_dispatch for all
  using (auth.role() = 'authenticated');

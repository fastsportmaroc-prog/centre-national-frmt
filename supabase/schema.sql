-- ============================================================
-- Tennis Center Pro — Script SQL complet
-- Exécuter dans Supabase → SQL Editor (dans l'ordre)
-- ============================================================

-- 1. Extensions
create extension if not exists btree_gist;

-- 2. Tables métier
create table if not exists public.joueurs (
  id uuid primary key default gen_random_uuid(),
  prenom text not null,
  nom text not null,
  email text,
  telephone text,
  niveau text,
  nationalite text,
  classement text,
  photo_url text,
  created_at timestamptz default now()
);

create table if not exists public.courts (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  surface text not null,
  couvert boolean default false,
  actif boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid not null references public.joueurs(id) on delete cascade,
  court_id uuid not null references public.courts(id) on delete restrict,
  date_debut timestamptz not null,
  date_fin timestamptz not null,
  statut text not null default 'confirmee'
    check (statut in ('confirmee', 'en_attente', 'annulee')),
  notes text,
  created_at timestamptz default now(),
  constraint reservations_dates_valid check (date_fin > date_debut)
);

alter table public.reservations drop constraint if exists reservations_no_overlap;
alter table public.reservations
  add constraint reservations_no_overlap
  exclude using gist (
    court_id with =,
    tstzrange(date_debut, date_fin, '[)') with &&
  )
  where (statut <> 'annulee');

create table if not exists public.hebergements (
  id uuid primary key default gen_random_uuid(),
  nom_chambre text not null,
  type_chambre text not null,
  capacite int not null default 1,
  occupe boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.repas (
  id uuid primary key default gen_random_uuid(),
  date_repas date not null,
  type_repas text not null,
  menu text,
  allergies text,
  nombre_personnes int default 0,
  created_at timestamptz default now()
);

-- 3. Auth & profils (voir 002_auth_storage_admin.sql pour le reste)
-- Puis activer Email auth dans Authentication → Providers

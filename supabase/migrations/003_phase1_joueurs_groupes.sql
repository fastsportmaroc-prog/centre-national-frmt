-- Phase 1 : Groupes, joueurs enrichis, courts enrichis, réservations

create table if not exists public.groupes (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  description text,
  couleur text,
  created_at timestamptz default now()
);

-- Migration joueurs (colonnes additionnelles)
alter table public.joueurs add column if not exists date_naissance date;
alter table public.joueurs add column if not exists categorie_age text;
alter table public.joueurs add column if not exists sexe text;
alter table public.joueurs add column if not exists groupe_id uuid references public.groupes(id) on delete set null;
alter table public.joueurs add column if not exists coach_referent text;
alter table public.joueurs add column if not exists statut text default 'actif';
alter table public.joueurs add column if not exists documents text;
alter table public.joueurs add column if not exists notes text;

-- Migration courts
alter table public.courts add column if not exists eclairage boolean default false;
alter table public.courts add column if not exists statut text default 'disponible';
alter table public.courts add column if not exists maintenance_jusquau timestamptz;
alter table public.courts add column if not exists notes text;

-- Migration réservations
alter table public.reservations add column if not exists updated_at timestamptz default now();

alter table public.reservations drop constraint if exists reservations_statut_check;
alter table public.reservations add constraint reservations_statut_check
  check (statut in ('confirmee', 'en_attente', 'annulee', 'terminee'));

alter table public.groupes enable row level security;
create policy "groupes_auth" on public.groupes for all to authenticated using (true) with check (true);

-- Groupes par défaut
insert into public.groupes (nom, description, couleur) values
  ('Élite', 'Joueurs de haut niveau', '#c8f542'),
  ('Développement', 'Potentiel national', '#60a5fa'),
  ('U18', 'Catégorie U18', '#f472b6'),
  ('U16', 'Catégorie U16', '#fb923c'),
  ('U14', 'Catégorie U14', '#a78bfa'),
  ('U12', 'Catégorie U12', '#34d399'),
  ('Loisir', 'Pratique loisir', '#94a3b8'),
  ('Préparation compétition', 'Stages compétition', '#fbbf24')
on conflict (nom) do nothing;

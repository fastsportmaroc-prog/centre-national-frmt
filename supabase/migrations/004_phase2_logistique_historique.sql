-- Phase 2 : Logistique, billets d'avion, historique audit

create table if not exists public.demandes_logistique (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  demandeur_nom text not null,
  demandeur_role text not null,
  joueur_concerne_id uuid references public.joueurs(id) on delete set null,
  titre text not null,
  description text,
  date_besoin date,
  statut text not null default 'brouillon',
  validateur_direction text,
  validateur_logistique text,
  date_validation_direction timestamptz,
  date_validation_logistique timestamptz,
  motif_refus text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.demandes_billet_avion (
  id uuid primary key default gen_random_uuid(),
  demandeur_nom text not null,
  demandeur_role text not null,
  type_personne text not null default 'joueur',
  joueur_concerne_id uuid references public.joueurs(id) on delete set null,
  joueur_concerne_nom text,
  ville_depart text not null,
  ville_arrivee text not null,
  date_aller date not null,
  date_retour date,
  preference_horaire text,
  bagage text,
  passeport text,
  motif_deplacement text not null,
  contexte text default 'tournoi',
  urgence boolean default false,
  statut text not null default 'en_attente',
  validateur text,
  date_validation timestamptz,
  agence_voyage text,
  notes text,
  piece_jointe_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.historique (
  id uuid primary key default gen_random_uuid(),
  utilisateur_nom text not null,
  utilisateur_role text not null,
  action text not null,
  module text not null,
  entite_id text,
  entite_label text,
  ancienne_valeur text,
  nouvelle_valeur text,
  commentaire text,
  created_at timestamptz default now()
);

alter table public.demandes_logistique enable row level security;
alter table public.demandes_billet_avion enable row level security;
alter table public.historique enable row level security;

create policy "demandes_logistique_auth" on public.demandes_logistique
  for all to authenticated using (true) with check (true);

create policy "demandes_billet_avion_auth" on public.demandes_billet_avion
  for all to authenticated using (true) with check (true);

create policy "historique_auth" on public.historique
  for all to authenticated using (true) with check (true);

create index if not exists idx_historique_created on public.historique(created_at desc);
create index if not exists idx_historique_module on public.historique(module);

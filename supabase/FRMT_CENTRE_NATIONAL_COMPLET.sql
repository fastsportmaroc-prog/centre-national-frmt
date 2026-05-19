-- =============================================================================
-- CENTRE NATIONAL FRMT — Schéma SQL complet
-- Projet : https://kcwvqwvcyiiwalyvhvxz.supabase.co
-- Usage : Supabase Dashboard → SQL Editor → New query → coller tout → Run
-- Contenu : migrations 001 à 015 + politiques RLS complémentaires
-- =============================================================================

-- ########## 001_init.sql ##########

-- Tennis Center Pro — schéma initial

create extension if not exists btree_gist;

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

alter table public.reservations
  drop constraint if exists reservations_no_overlap;

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

alter table public.joueurs enable row level security;
alter table public.courts enable row level security;
alter table public.reservations enable row level security;
alter table public.hebergements enable row level security;
alter table public.repas enable row level security;

create policy "allow_all_dev" on public.joueurs for all using (true) with check (true);
create policy "allow_all_dev" on public.courts for all using (true) with check (true);
create policy "allow_all_dev" on public.reservations for all using (true) with check (true);
create policy "allow_all_dev" on public.hebergements for all using (true) with check (true);
create policy "allow_all_dev" on public.repas for all using (true) with check (true);

-- ########## 002_auth_storage_admin.sql ##########

-- Tennis Center Pro — Auth, profils, storage, RLS sécurisées

-- Profils utilisateurs (liés à auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Trigger : créer profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage : photos joueurs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'joueurs-photos',
  'joueurs-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "photos_public_read" on storage.objects;
create policy "photos_public_read"
  on storage.objects for select
  using (bucket_id = 'joueurs-photos');

drop policy if exists "photos_auth_upload" on storage.objects;
create policy "photos_auth_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'joueurs-photos');

drop policy if exists "photos_auth_update" on storage.objects;
create policy "photos_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'joueurs-photos');

drop policy if exists "photos_auth_delete" on storage.objects;
create policy "photos_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'joueurs-photos');

-- RLS métier : utilisateurs authentifiés
drop policy if exists "allow_all_dev" on public.joueurs;
drop policy if exists "allow_all_dev" on public.courts;
drop policy if exists "allow_all_dev" on public.reservations;
drop policy if exists "allow_all_dev" on public.hebergements;
drop policy if exists "allow_all_dev" on public.repas;

drop policy if exists "joueurs_auth_all" on public.joueurs;
create policy "joueurs_auth_all" on public.joueurs
  for all to authenticated using (true) with check (true);

drop policy if exists "courts_auth_all" on public.courts;
create policy "courts_auth_all" on public.courts
  for all to authenticated using (true) with check (true);

drop policy if exists "reservations_auth_all" on public.reservations;
create policy "reservations_auth_all" on public.reservations
  for all to authenticated using (true) with check (true);

drop policy if exists "hebergements_auth_all" on public.hebergements;
create policy "hebergements_auth_all" on public.hebergements
  for all to authenticated using (true) with check (true);

drop policy if exists "repas_auth_all" on public.repas;
create policy "repas_auth_all" on public.repas
  for all to authenticated using (true) with check (true);

-- Données de démo (optionnel)
insert into public.courts (nom, surface, couvert, actif)
select 'Court Central', 'Terre battue', false, true
where not exists (select 1 from public.courts limit 1);

insert into public.courts (nom, surface, couvert, actif)
select 'Court 2', 'Dur', true, true
where (select count(*) from public.courts) < 2;

-- Premier admin : après inscription, exécuter :
-- update public.profiles set role = 'admin' where email = 'votre@email.com';

-- ########## 003_phase1_joueurs_groupes.sql ##########

-- Phase 1 : Groupes, joueurs enrichis, courts enrichis, réservations

create table if not exists public.groupes (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  description text,
  couleur text,
  created_at timestamptz default now()
);

alter table public.joueurs add column if not exists date_naissance date;
alter table public.joueurs add column if not exists categorie_age text;
alter table public.joueurs add column if not exists sexe text;
alter table public.joueurs add column if not exists groupe_id uuid references public.groupes(id) on delete set null;
alter table public.joueurs add column if not exists coach_referent text;
alter table public.joueurs add column if not exists statut text default 'actif';
alter table public.joueurs add column if not exists documents text;
alter table public.joueurs add column if not exists notes text;

alter table public.courts add column if not exists eclairage boolean default false;
alter table public.courts add column if not exists statut text default 'disponible';
alter table public.courts add column if not exists maintenance_jusquau timestamptz;
alter table public.courts add column if not exists notes text;

alter table public.reservations add column if not exists updated_at timestamptz default now();

alter table public.reservations drop constraint if exists reservations_statut_check;
alter table public.reservations add constraint reservations_statut_check
  check (statut in ('confirmee', 'en_attente', 'annulee', 'terminee'));

alter table public.groupes enable row level security;
drop policy if exists "groupes_auth" on public.groupes;
create policy "groupes_auth" on public.groupes for all to authenticated using (true) with check (true);

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

-- ########## 004_phase2_logistique_historique.sql ##########

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

drop policy if exists "demandes_logistique_auth" on public.demandes_logistique;
create policy "demandes_logistique_auth" on public.demandes_logistique
  for all to authenticated using (true) with check (true);

drop policy if exists "demandes_billet_avion_auth" on public.demandes_billet_avion;
create policy "demandes_billet_avion_auth" on public.demandes_billet_avion
  for all to authenticated using (true) with check (true);

drop policy if exists "historique_auth" on public.historique;
create policy "historique_auth" on public.historique
  for all to authenticated using (true) with check (true);

create index if not exists idx_historique_created on public.historique(created_at desc);
create index if not exists idx_historique_module on public.historique(module);

-- ########## 005_passeport.sql ##########

-- Dossiers passeport, visas et assurance voyage

create table if not exists public.dossiers_passeport (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid not null references public.joueurs(id) on delete cascade,
  numero_passeport text,
  pays_emission text,
  date_emission date,
  date_expiration date,
  image_passeport_url text,
  visas jsonb not null default '[]'::jsonb,
  assurance jsonb,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (joueur_id)
);

alter table public.dossiers_passeport enable row level security;

drop policy if exists "dossiers_passeport_auth" on public.dossiers_passeport;
create policy "dossiers_passeport_auth" on public.dossiers_passeport
  for all to authenticated using (true) with check (true);

create index if not exists idx_dossiers_passeport_joueur on public.dossiers_passeport(joueur_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'passeport-documents',
  'passeport-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- ########## 006_performances_maroc.sql ##########

-- Performances internationales — joueurs marocains FRMT

alter table public.joueurs add column if not exists country_code text;
alter table public.joueurs add column if not exists federation text;
alter table public.joueurs add column if not exists external_atp_id text;
alter table public.joueurs add column if not exists external_wta_id text;
alter table public.joueurs add column if not exists external_itf_id text;
alter table public.joueurs add column if not exists external_itf_junior_id text;
alter table public.joueurs add column if not exists external_tennis_provider_id text;
alter table public.joueurs add column if not exists is_marocain boolean default false;
alter table public.joueurs add column if not exists is_frmt_tracked boolean default false;

create index if not exists joueurs_maroc_tracked_idx
  on public.joueurs (is_frmt_tracked, country_code)
  where is_frmt_tracked = true;

comment on column public.joueurs.is_frmt_tracked is
  'Suivi performances internationales FRMT (MAR uniquement)';

create table if not exists public.performance_sync_log (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  synced_at timestamptz not null default now(),
  joueurs_count int default 0,
  matchs_count int default 0,
  rankings_count int default 0
);

alter table public.performance_sync_log enable row level security;

-- ########## 007_hebergement_pavillons.sql ##########

alter table public.hebergements add column if not exists pavillon int default 1;
alter table public.hebergements add column if not exists numero_chambre int default 1;
alter table public.hebergements add column if not exists type_chambre_code text default 'double';

comment on column public.hebergements.pavillon is 'Pavillon 1, 2 ou 3';
comment on column public.hebergements.numero_chambre is 'Numéro de chambre dans le pavillon (1–5+)';
comment on column public.hebergements.type_chambre_code is 'single | double | triple';

create index if not exists hebergements_pavillon_idx
  on public.hebergements (pavillon, numero_chambre);

-- ########## 008_billets_aeroports.sql ##########

alter table public.demandes_billet_avion add column if not exists aeroport_depart_code text;
alter table public.demandes_billet_avion add column if not exists aeroport_arrivee_code text;
alter table public.demandes_billet_avion add column if not exists aller_retour boolean default true;
alter table public.demandes_billet_avion add column if not exists duree_sejour_jours int default 7;

-- ########## 009_billets_prix_depenses.sql ##########

alter table public.demandes_billet_avion add column if not exists prix_billet numeric(12, 2);
alter table public.demandes_billet_avion add column if not exists prix_devise text default 'MAD';
alter table public.demandes_billet_avion add column if not exists aller_retour_accorde boolean;
alter table public.demandes_billet_avion add column if not exists date_retour_accorde date;
alter table public.demandes_billet_avion add column if not exists depense_joueur_id uuid;
alter table public.demandes_billet_avion add column if not exists depense_enregistree boolean default false;

create table if not exists public.joueur_depenses (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid not null references public.joueurs(id) on delete cascade,
  date_depense date not null default current_date,
  categorie text not null check (categorie in ('billet_avion', 'hebergement', 'restauration', 'transport', 'autre')),
  libelle text not null,
  montant numeric(12, 2) not null check (montant >= 0),
  devise text not null default 'MAD',
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_joueur_depenses_joueur on public.joueur_depenses(joueur_id);

alter table public.joueur_depenses enable row level security;

-- ########## 010_restauration_prestataires.sql ##########

create table if not exists public.prestataires_restauration (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  contact_nom text,
  email text,
  telephone text,
  adresse text,
  notes text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.besoins_restauration (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  type_evenement text not null,
  date_evenement date not null,
  date_besoin date not null,
  type_repas text not null,
  nombre_personnes int not null default 1,
  menu_prevu text,
  allergies text,
  prestataire_id uuid references public.prestataires_restauration(id) on delete set null,
  prestataire_nom text,
  statut text not null default 'brouillon',
  montant_estime numeric(12, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.factures_restauration (
  id uuid primary key default gen_random_uuid(),
  prestataire_id uuid not null references public.prestataires_restauration(id) on delete restrict,
  besoin_id uuid references public.besoins_restauration(id) on delete set null,
  numero_facture text not null,
  date_facture date not null,
  date_echeance date,
  montant_ht numeric(12, 2) not null,
  montant_ttc numeric(12, 2) not null,
  tva_pct numeric(5, 2) not null default 20,
  devise text not null default 'MAD',
  statut text not null default 'emise',
  piece_jointe_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_besoins_restauration_prestataire on public.besoins_restauration(prestataire_id);
create index if not exists idx_factures_restauration_prestataire on public.factures_restauration(prestataire_id);
create index if not exists idx_factures_restauration_besoin on public.factures_restauration(besoin_id);

alter table public.prestataires_restauration enable row level security;
alter table public.besoins_restauration enable row level security;
alter table public.factures_restauration enable row level security;

-- ########## 011_cne_stages_occupation.sql ##########

create table if not exists public.stages_programme (
  id uuid primary key default gen_random_uuid(),
  id_excel text,
  source text not null default 'FRMT',
  categorie text not null,
  stage_action text not null,
  date_debut date not null,
  date_fin date not null,
  nombre_joueurs int not null default 0,
  nombre_encadrants int not null default 0,
  hebergement boolean not null default true,
  chambres int not null default 0,
  lieu text,
  notes text,
  budget_prevu numeric(12, 2),
  budget_reel numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.occupation_cne (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  pavillon int not null default 0,
  numero_chambre int not null default 0,
  type_chambre text not null,
  capacite int not null default 1,
  occupants int not null default 0,
  stage_id uuid references public.stages_programme(id) on delete set null,
  stage_id_excel text,
  stage_libelle text,
  categorie text,
  taux_occupation_pct numeric(6, 2) not null default 0,
  alerte text,
  created_at timestamptz not null default now()
);

create index if not exists idx_stages_programme_dates on public.stages_programme(date_debut, date_fin);
create index if not exists idx_occupation_cne_date on public.occupation_cne(date);

alter table public.stages_programme enable row level security;
alter table public.occupation_cne enable row level security;

-- ########## 012_system_import_logs.sql ##########

create table if not exists public.import_history (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  filename text,
  stages_imported int not null default 0,
  occupation_imported int not null default 0,
  errors jsonb not null default '[]',
  status text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null,
  module text not null,
  message text not null,
  details text,
  created_at timestamptz not null default now()
);

alter table public.import_history enable row level security;
alter table public.system_logs enable row level security;

-- ########## 013_entraineurs_budget.sql ##########

create table if not exists public.entraineurs (
  id uuid primary key default gen_random_uuid(),
  prenom text not null,
  nom text not null,
  email text,
  telephone text,
  specialite text,
  licence_fft text,
  statut text not null default 'actif',
  groupe_ids text[] not null default '{}',
  budget_voyages_annuel numeric(12, 2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.missions_entraineur (
  id uuid primary key default gen_random_uuid(),
  entraineur_id uuid not null references public.entraineurs(id) on delete cascade,
  stage_id uuid references public.stages_programme(id) on delete set null,
  titre text not null,
  lieu text,
  date_debut date not null,
  date_fin date not null,
  type_mission text not null default 'stage',
  statut text not null default 'planifie',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.entraineur_depenses (
  id uuid primary key default gen_random_uuid(),
  entraineur_id uuid not null references public.entraineurs(id) on delete cascade,
  date_depense date not null,
  categorie text not null,
  libelle text not null,
  montant numeric(12, 2) not null,
  devise text not null default 'MAD',
  mission_id uuid references public.missions_entraineur(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.disponibilites_entraineur (
  id uuid primary key default gen_random_uuid(),
  entraineur_id uuid not null references public.entraineurs(id) on delete cascade,
  date date not null,
  disponible boolean not null default true,
  motif text,
  unique (entraineur_id, date)
);

create table if not exists public.budget_annuel (
  id uuid primary key default gen_random_uuid(),
  annee int not null,
  categorie text not null,
  libelle text not null,
  montant_alloue numeric(14, 2) not null default 0,
  montant_engage numeric(14, 2) not null default 0,
  montant_reel numeric(14, 2) not null default 0,
  devise text not null default 'MAD',
  notes text,
  updated_at timestamptz not null default now(),
  unique (annee, categorie)
);

create index if not exists idx_missions_entraineur_dates on public.missions_entraineur(date_debut, date_fin);
create index if not exists idx_entraineur_depenses_date on public.entraineur_depenses(date_depense);
create index if not exists idx_budget_annuel_annee on public.budget_annuel(annee);

alter table public.entraineurs enable row level security;
alter table public.missions_entraineur enable row level security;
alter table public.entraineur_depenses enable row level security;
alter table public.disponibilites_entraineur enable row level security;
alter table public.budget_annuel enable row level security;

-- ########## 014_infrastructures_materiel_budget_deplacement.sql ##########

create table if not exists public.infrastructures (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type text not null,
  surface text not null default 'autre',
  capacite int not null default 0,
  actif boolean not null default true,
  statut text not null default 'disponible',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.infrastructure_usages (
  id uuid primary key default gen_random_uuid(),
  infrastructure_id uuid not null references public.infrastructures(id) on delete cascade,
  date_debut timestamptz not null,
  date_fin timestamptz not null,
  module text not null,
  reference_id text,
  commentaire text
);

create table if not exists public.materiels (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  categorie text not null,
  quantite_totale int not null default 0,
  quantite_disponible int not null default 0,
  quantite_utilisee int not null default 0,
  seuil_alerte int not null default 0,
  etat text not null default 'disponible',
  emplacement text,
  fournisseur text,
  prix_unitaire numeric(12, 2),
  notes text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mouvements_materiel (
  id uuid primary key default gen_random_uuid(),
  materiel_id uuid not null references public.materiels(id) on delete cascade,
  stage_id uuid references public.stages_programme(id) on delete set null,
  type_mouvement text not null,
  quantite int not null,
  commentaire text,
  created_at timestamptz not null default now()
);

create table if not exists public.budget_deplacement (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid not null references public.joueurs(id) on delete cascade,
  coach_id uuid references public.entraineurs(id) on delete set null,
  tournoi text not null,
  destination text not null,
  date_depart date not null,
  date_retour date not null,
  avec_coach boolean not null default false,
  devise text not null default 'MAD',
  statut text not null default 'brouillon',
  total_previsionnel numeric(14, 2) not null default 0,
  total_reel numeric(14, 2) not null default 0,
  valide_par text,
  date_validation timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lignes_budget_deplacement (
  id uuid primary key default gen_random_uuid(),
  budget_deplacement_id uuid not null references public.budget_deplacement(id) on delete cascade,
  joueur_id uuid not null references public.joueurs(id) on delete cascade,
  categorie text not null,
  description text not null,
  quantite numeric(12, 2) not null default 1,
  prix_unitaire numeric(12, 2) not null default 0,
  montant_total numeric(14, 2) not null default 0,
  devise text not null default 'MAD',
  type text not null default 'previsionnel',
  impute_joueur boolean not null default true,
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_infrastructures_type on public.infrastructures(type);
create index if not exists idx_materiels_categorie on public.materiels(categorie);
create index if not exists idx_budget_deplacement_joueur on public.budget_deplacement(joueur_id);
create index if not exists idx_lignes_budget_deplacement_budget on public.lignes_budget_deplacement(budget_deplacement_id);

alter table public.infrastructures enable row level security;
alter table public.infrastructure_usages enable row level security;
alter table public.materiels enable row level security;
alter table public.mouvements_materiel enable row level security;
alter table public.budget_deplacement enable row level security;
alter table public.lignes_budget_deplacement enable row level security;

-- ########## 015_stages_links_reservations_infra.sql ##########

alter table public.stages_programme
  add column if not exists statut text not null default 'prevu',
  add column if not exists infrastructure_ids text[] not null default '{}',
  add column if not exists entraineur_ids text[] not null default '{}',
  add column if not exists materiel_assignations jsonb not null default '[]'::jsonb;

create table if not exists public.reservations_infrastructure (
  id uuid primary key default gen_random_uuid(),
  infrastructure_id uuid not null references public.infrastructures(id) on delete cascade,
  date_debut timestamptz not null,
  date_fin timestamptz not null,
  statut text not null default 'confirmee',
  joueur_id uuid references public.joueurs(id) on delete set null,
  groupe_id uuid references public.groupes(id) on delete set null,
  stage_id uuid references public.stages_programme(id) on delete set null,
  entraineur_id uuid references public.entraineurs(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reservations_infra_dates on public.reservations_infrastructure(infrastructure_id, date_debut, date_fin);
create index if not exists idx_stages_programme_statut on public.stages_programme(statut);

alter table public.reservations_infrastructure enable row level security;

-- ########## 016_rls_complement — politiques manquantes ##########

drop policy if exists "performance_sync_auth" on public.performance_sync_log;
create policy "performance_sync_auth" on public.performance_sync_log
  for all to authenticated using (true) with check (true);

drop policy if exists "joueur_depenses_auth" on public.joueur_depenses;
create policy "joueur_depenses_auth" on public.joueur_depenses
  for all to authenticated using (true) with check (true);

drop policy if exists "prestataires_restauration_auth" on public.prestataires_restauration;
create policy "prestataires_restauration_auth" on public.prestataires_restauration
  for all to authenticated using (true) with check (true);

drop policy if exists "besoins_restauration_auth" on public.besoins_restauration;
create policy "besoins_restauration_auth" on public.besoins_restauration
  for all to authenticated using (true) with check (true);

drop policy if exists "factures_restauration_auth" on public.factures_restauration;
create policy "factures_restauration_auth" on public.factures_restauration
  for all to authenticated using (true) with check (true);

drop policy if exists "stages_programme_auth" on public.stages_programme;
create policy "stages_programme_auth" on public.stages_programme
  for all to authenticated using (true) with check (true);

drop policy if exists "occupation_cne_auth" on public.occupation_cne;
create policy "occupation_cne_auth" on public.occupation_cne
  for all to authenticated using (true) with check (true);

drop policy if exists "import_history_auth" on public.import_history;
create policy "import_history_auth" on public.import_history
  for all to authenticated using (true) with check (true);

drop policy if exists "system_logs_auth" on public.system_logs;
create policy "system_logs_auth" on public.system_logs
  for all to authenticated using (true) with check (true);

drop policy if exists "entraineurs_auth" on public.entraineurs;
create policy "entraineurs_auth" on public.entraineurs
  for all to authenticated using (true) with check (true);

drop policy if exists "missions_entraineur_auth" on public.missions_entraineur;
create policy "missions_entraineur_auth" on public.missions_entraineur
  for all to authenticated using (true) with check (true);

drop policy if exists "entraineur_depenses_auth" on public.entraineur_depenses;
create policy "entraineur_depenses_auth" on public.entraineur_depenses
  for all to authenticated using (true) with check (true);

drop policy if exists "disponibilites_entraineur_auth" on public.disponibilites_entraineur;
create policy "disponibilites_entraineur_auth" on public.disponibilites_entraineur
  for all to authenticated using (true) with check (true);

drop policy if exists "budget_annuel_auth" on public.budget_annuel;
create policy "budget_annuel_auth" on public.budget_annuel
  for all to authenticated using (true) with check (true);

drop policy if exists "infrastructures_auth" on public.infrastructures;
create policy "infrastructures_auth" on public.infrastructures
  for all to authenticated using (true) with check (true);

drop policy if exists "infrastructure_usages_auth" on public.infrastructure_usages;
create policy "infrastructure_usages_auth" on public.infrastructure_usages
  for all to authenticated using (true) with check (true);

drop policy if exists "materiels_auth" on public.materiels;
create policy "materiels_auth" on public.materiels
  for all to authenticated using (true) with check (true);

drop policy if exists "mouvements_materiel_auth" on public.mouvements_materiel;
create policy "mouvements_materiel_auth" on public.mouvements_materiel
  for all to authenticated using (true) with check (true);

drop policy if exists "budget_deplacement_auth" on public.budget_deplacement;
create policy "budget_deplacement_auth" on public.budget_deplacement
  for all to authenticated using (true) with check (true);

drop policy if exists "lignes_budget_deplacement_auth" on public.lignes_budget_deplacement;
create policy "lignes_budget_deplacement_auth" on public.lignes_budget_deplacement
  for all to authenticated using (true) with check (true);

drop policy if exists "reservations_infrastructure_auth" on public.reservations_infrastructure;
create policy "reservations_infrastructure_auth" on public.reservations_infrastructure
  for all to authenticated using (true) with check (true);

drop policy if exists "passeport_docs_auth_read" on storage.objects;
create policy "passeport_docs_auth_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'passeport-documents');

drop policy if exists "passeport_docs_auth_write" on storage.objects;
create policy "passeport_docs_auth_write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'passeport-documents')
  with check (bucket_id = 'passeport-documents');

-- =============================================================================
-- FIN — Vérification :
-- select table_name from information_schema.tables where table_schema = 'public' order by 1;
-- Premier admin : update public.profiles set role = 'admin' where email = 'votre@email.com';
-- =============================================================================


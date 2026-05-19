-- Restauration : prestataires, besoins par événement, factures

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

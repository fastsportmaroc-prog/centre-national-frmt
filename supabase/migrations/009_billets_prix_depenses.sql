-- Prix à l'accord + compte dépenses joueur

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

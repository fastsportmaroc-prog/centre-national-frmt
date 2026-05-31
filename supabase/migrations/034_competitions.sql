-- Module Compétitions FRMT (copie de lib/db/migrations/competitions.sql)

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  categorie text not null default 'Seniors',
  date_debut date not null,
  date_fin date not null,
  lieu text,
  statut text not null default 'a_venir'
    check (statut in ('a_venir', 'en_cours', 'terminee', 'annulee')),
  visas_requis boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competition_participants (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  participant_id uuid not null,
  participant_type text not null check (participant_type in ('joueur', 'coach')),
  created_at timestamptz not null default now(),
  unique (competition_id, participant_id, participant_type)
);

create table if not exists public.competition_textiles (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  participant_id uuid not null,
  article_id uuid not null references public.materiels(id) on delete restrict,
  taille text,
  quantite integer not null default 1 check (quantite > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.competition_budget (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  categorie text not null check (categorie in (
    'billets_avion', 'hebergement', 'restauration', 'textiles',
    'frais_inscription', 'divers'
  )),
  montant_prevu numeric(12, 2) not null default 0,
  montant_reel numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, categorie)
);

create table if not exists public.competition_billets (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  participant_id uuid not null,
  type text not null check (type in ('aller', 'retour')),
  date_vol date not null,
  heure time,
  numero_vol text,
  compagnie text,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'reserve', 'confirme')),
  created_at timestamptz not null default now()
);

create table if not exists public.competition_documents (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  nom text not null,
  type text not null default 'autre'
    check (type in ('convocation', 'resultat', 'rapport', 'lettre_officielle', 'autre')),
  url text not null,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.competition_historique (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  utilisateur_id uuid,
  action text not null,
  details text,
  created_at timestamptz not null default now()
);

create index if not exists idx_competition_participants_competition
  on public.competition_participants(competition_id);
create index if not exists idx_competition_textiles_competition
  on public.competition_textiles(competition_id);
create index if not exists idx_competition_budget_competition
  on public.competition_budget(competition_id);
create index if not exists idx_competition_billets_competition
  on public.competition_billets(competition_id);
create index if not exists idx_competition_documents_competition
  on public.competition_documents(competition_id);
create index if not exists idx_competition_historique_competition
  on public.competition_historique(competition_id);

alter table public.competitions enable row level security;
alter table public.competition_participants enable row level security;
alter table public.competition_textiles enable row level security;
alter table public.competition_budget enable row level security;
alter table public.competition_billets enable row level security;
alter table public.competition_documents enable row level security;
alter table public.competition_historique enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'competitions', 'competition_participants', 'competition_textiles',
    'competition_budget', 'competition_billets', 'competition_documents',
    'competition_historique'
  ] loop
    execute format('drop policy if exists %I_auth on public.%I', t, t);
    execute format(
      'create policy %I_auth on public.%I for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- Stock textile initial par compétition (pool décrémenté à chaque attribution)

create table if not exists public.competition_materiel_stock (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  article_id uuid not null references public.materiels(id) on delete restrict,
  quantite_initiale integer not null default 0 check (quantite_initiale >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id, article_id)
);

create index if not exists idx_competition_materiel_stock_competition
  on public.competition_materiel_stock(competition_id);

alter table public.competition_materiel_stock enable row level security;

drop policy if exists competition_materiel_stock_auth on public.competition_materiel_stock;
create policy competition_materiel_stock_auth on public.competition_materiel_stock
  for all to authenticated using (true) with check (true);

-- Cache local des réponses RapidAPI (sync sans quota journalier)
create table if not exists public.classements_externes_api_cache (
  cache_key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);

create index if not exists classements_externes_api_cache_fetched_at_idx
  on public.classements_externes_api_cache (fetched_at desc);

alter table public.classements_externes_api_cache enable row level security;

-- Lecture réservée au service role (admin client) ; pas d'accès client direct.

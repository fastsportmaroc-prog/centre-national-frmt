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

-- Métadonnées sync (optionnel Supabase)
create table if not exists public.performance_sync_log (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  synced_at timestamptz not null default now(),
  joueurs_count int default 0,
  matchs_count int default 0,
  rankings_count int default 0
);

alter table public.performance_sync_log enable row level security;
create policy "performance_sync_auth" on public.performance_sync_log
  for all to authenticated using (true) with check (true);

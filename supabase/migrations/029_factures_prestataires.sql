create table if not exists public.factures_prestataires (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null,
  service_type text not null check (service_type in ('hebergement', 'restauration')),
  prestataire_nom text,
  montant numeric(12,2) default 0,
  facture_url text,
  reference text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_factures_prestataires_stage_service
  on public.factures_prestataires(stage_id, service_type);

alter table public.factures_prestataires enable row level security;

drop policy if exists "factures_prestataires_auth" on public.factures_prestataires;
create policy "factures_prestataires_auth" on public.factures_prestataires
  for all to authenticated
  using (true)
  with check (true);

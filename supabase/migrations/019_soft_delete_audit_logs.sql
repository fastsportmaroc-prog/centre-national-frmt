-- Soft delete + audit_logs (NON destructif — colonnes ajoutées seulement)

-- Table audit structurée (complète historique existant)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  user_id text,
  user_name text,
  user_role text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_auth" on public.audit_logs;
create policy "audit_logs_auth" on public.audit_logs
  for all to authenticated using (true) with check (true);

-- Soft delete : joueurs
alter table public.joueurs add column if not exists deleted_at timestamptz;
alter table public.joueurs add column if not exists deleted_by text;
alter table public.joueurs add column if not exists delete_reason text;

-- Entraîneurs
alter table public.entraineurs add column if not exists deleted_at timestamptz;
alter table public.entraineurs add column if not exists deleted_by text;
alter table public.entraineurs add column if not exists delete_reason text;

-- Groupes
alter table public.groupes add column if not exists deleted_at timestamptz;
alter table public.groupes add column if not exists deleted_by text;
alter table public.groupes add column if not exists delete_reason text;

-- Infrastructures
alter table public.infrastructures add column if not exists deleted_at timestamptz;
alter table public.infrastructures add column if not exists deleted_by text;
alter table public.infrastructures add column if not exists delete_reason text;

-- Matériel
alter table public.materiels add column if not exists deleted_at timestamptz;
alter table public.materiels add column if not exists deleted_by text;
alter table public.materiels add column if not exists delete_reason text;

-- Stages
alter table public.stages_programme add column if not exists deleted_at timestamptz;
alter table public.stages_programme add column if not exists deleted_by text;
alter table public.stages_programme add column if not exists delete_reason text;

-- Réservations (annulation logique)
alter table public.reservations add column if not exists deleted_at timestamptz;
alter table public.reservations add column if not exists deleted_by text;
alter table public.reservations add column if not exists delete_reason text;

comment on table public.audit_logs is 'Journal audit JSON — actions CRUD et exports';

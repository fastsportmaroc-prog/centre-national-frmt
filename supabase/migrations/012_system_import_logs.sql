-- Historique imports + logs système

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

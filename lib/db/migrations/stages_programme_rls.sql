-- Politiques RLS stages_programme + tables liées (création stage V2)
-- À exécuter dans Supabase → SQL Editor si erreur "row-level security policy"

alter table public.stages_programme enable row level security;

drop policy if exists "stages_programme_auth" on public.stages_programme;
create policy "stages_programme_auth" on public.stages_programme
  for all to authenticated using (true) with check (true);

-- Liens participants (si tables existantes)
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'stage_joueurs') then
    alter table public.stage_joueurs enable row level security;
    drop policy if exists "stage_joueurs_auth" on public.stage_joueurs;
    create policy "stage_joueurs_auth" on public.stage_joueurs
      for all to authenticated using (true) with check (true);
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'stage_coachs') then
    alter table public.stage_coachs enable row level security;
    drop policy if exists "stage_coachs_auth" on public.stage_coachs;
    create policy "stage_coachs_auth" on public.stage_coachs
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- RLS kinésithérapie — accès authentifié (aligné hebergements / repas)

alter table public.kinesitherapie_seances enable row level security;
alter table public.kinesitherapie_stages enable row level security;
alter table public.kinesitherapie_stage_participants enable row level security;

drop policy if exists "kinesitherapie_seances_auth_all" on public.kinesitherapie_seances;
drop policy if exists "kinesitherapie_stages_auth_all" on public.kinesitherapie_stages;
drop policy if exists "kinesitherapie_stage_participants_auth_all" on public.kinesitherapie_stage_participants;

create policy "kinesitherapie_seances_auth_all" on public.kinesitherapie_seances
  for all to authenticated using (true) with check (true);

create policy "kinesitherapie_stages_auth_all" on public.kinesitherapie_stages
  for all to authenticated using (true) with check (true);

create policy "kinesitherapie_stage_participants_auth_all" on public.kinesitherapie_stage_participants
  for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';

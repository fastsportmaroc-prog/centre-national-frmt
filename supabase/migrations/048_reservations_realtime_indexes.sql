-- Realtime + index performance for reservations_infrastructure (V2)

create index if not exists idx_res_infra_date_debut
  on public.reservations_infrastructure (date_debut);

create index if not exists idx_res_infra_stage
  on public.reservations_infrastructure (stage_id)
  where stage_id is not null;

alter table public.reservations_infrastructure replica identity full;

do $migration$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.reservations_infrastructure';
    exception
      when duplicate_object then null;
    end;
    begin
      execute 'alter publication supabase_realtime add table public.stages_programme';
    exception
      when duplicate_object then null;
    end;
  end if;
end
$migration$;

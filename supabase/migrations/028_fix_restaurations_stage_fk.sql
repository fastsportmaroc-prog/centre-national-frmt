-- Fix définitif FK restauration -> stages_programme
-- Objectif: permettre l'insertion restauration depuis les stages V2 (stages_programme)

-- 1) Supprime ancienne FK (souvent vers public.stages)
alter table public.restaurations
  drop constraint if exists restaurations_stage_id_fkey;

-- 2) Tente de remapper les anciennes lignes liées à public.stages vers public.stages_programme
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'stages'
  ) then
    update public.restaurations r
    set stage_id = sp.id
    from public.stages s
    join public.stages_programme sp
      on sp.stage_action = s.nom
     and sp.date_debut = s.date_debut
     and sp.date_fin = s.date_fin
     and coalesce(sp.categorie, '') = coalesce(s.categorie, '')
    where r.stage_id = s.id
      and r.stage_id <> sp.id;
  end if;
end $$;

-- 3) Ajoute la FK correcte (NOT VALID = n'échoue pas si anciennes lignes orphelines)
alter table public.restaurations
  add constraint restaurations_stage_id_fkey
  foreign key (stage_id)
  references public.stages_programme(id)
  on delete cascade
  not valid;

-- 4) Vérification facultative des nouvelles lignes (les anciennes orphelines éventuelles restent tolérées)
-- alter table public.restaurations validate constraint restaurations_stage_id_fkey;

create index if not exists idx_restaurations_stage_id
  on public.restaurations(stage_id);

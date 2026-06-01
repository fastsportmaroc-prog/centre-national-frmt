-- Flag kinésithérapie sur stages_programme (checklist / rapports)
alter table public.stages_programme
  add column if not exists kinesitherapie boolean not null default false;

comment on column public.stages_programme.kinesitherapie is 'Stage avec suivi kinésithérapie';

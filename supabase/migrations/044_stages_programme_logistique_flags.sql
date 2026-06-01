-- Flags logistiques sur stages_programme (checklist / PDF)
alter table public.stages_programme
  add column if not exists terrains boolean not null default false,
  add column if not exists restauration boolean not null default false,
  add column if not exists transport_avion boolean not null default false;

comment on column public.stages_programme.terrains is 'Stage avec réservation terrain configurée';
comment on column public.stages_programme.restauration is 'Stage avec restauration configurée';
comment on column public.stages_programme.transport_avion is 'Stage avec transport avion';

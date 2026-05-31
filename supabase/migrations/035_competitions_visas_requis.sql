-- Option visas à la création / édition compétition
alter table public.competitions
  add column if not exists visas_requis boolean not null default false;

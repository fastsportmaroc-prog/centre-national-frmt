-- Hébergement : pavillons 1–3, chambres single/double/triple

alter table public.hebergements add column if not exists pavillon int default 1;
alter table public.hebergements add column if not exists numero_chambre int default 1;
alter table public.hebergements add column if not exists type_chambre_code text default 'double';

comment on column public.hebergements.pavillon is 'Pavillon 1, 2 ou 3';
comment on column public.hebergements.numero_chambre is 'Numéro de chambre dans le pavillon (1–5+)';
comment on column public.hebergements.type_chambre_code is 'single | double | triple';

create index if not exists hebergements_pavillon_idx
  on public.hebergements (pavillon, numero_chambre);

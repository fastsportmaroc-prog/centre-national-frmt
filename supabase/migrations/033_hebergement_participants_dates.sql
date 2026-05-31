-- Dates d'hébergement par participant (arrivée / départ personnalisés)
alter table public.hebergements
  add column if not exists participants_dates jsonb not null default '[]'::jsonb;

comment on column public.hebergements.participants_dates is
  'Dates hébergement par joueur/coach (JSON : personne_id, personne_type, date_debut, date_fin, dates_personnalisees)';

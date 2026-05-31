-- Passeport sur la fiche joueur (sync avec module Passeports & Visas)

alter table public.joueurs
  add column if not exists passeport_numero text,
  add column if not exists passeport_expiration date;

comment on column public.joueurs.passeport_numero is 'N° passeport (copie fiche, source admin_documents possible)';
comment on column public.joueurs.passeport_expiration is 'Date expiration passeport';

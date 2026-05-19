-- Billets d'avion : aéroports IATA + aller-retour automatique

alter table public.demandes_billet_avion add column if not exists aeroport_depart_code text;
alter table public.demandes_billet_avion add column if not exists aeroport_arrivee_code text;
alter table public.demandes_billet_avion add column if not exists aller_retour boolean default true;
alter table public.demandes_billet_avion add column if not exists duree_sejour_jours int default 7;

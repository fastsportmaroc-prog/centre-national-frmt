-- Passeport encadrants (FRMT)
alter table public.entraineurs
  add column if not exists passeport_numero text,
  add column if not exists passeport_expiration date;

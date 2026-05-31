-- =============================================================================
-- update-reservations-creneau.sql
-- À exécuter dans Supabase Studio → SQL Editor → Run
-- Colonne creneau pour réservations terrains (matin / apres_midi / journee)
-- =============================================================================

ALTER TABLE public.reservations_infrastructure
  ADD COLUMN IF NOT EXISTS creneau TEXT DEFAULT 'journee';

ALTER TABLE public.reservations_infrastructure
  ADD COLUMN IF NOT EXISTS heure_debut TEXT;

ALTER TABLE public.reservations_infrastructure
  ADD COLUMN IF NOT EXISTS heure_fin TEXT;

UPDATE public.reservations_infrastructure
SET
  creneau = CASE
    WHEN EXTRACT(HOUR FROM date_fin AT TIME ZONE 'UTC') <= 13
      AND EXTRACT(HOUR FROM date_debut AT TIME ZONE 'UTC') < 14
      THEN 'matin'
    WHEN EXTRACT(HOUR FROM date_debut AT TIME ZONE 'UTC') >= 14 THEN 'apres_midi'
    ELSE 'journee'
  END,
  heure_debut = CASE
    WHEN EXTRACT(HOUR FROM date_fin AT TIME ZONE 'UTC') <= 13
      AND EXTRACT(HOUR FROM date_debut AT TIME ZONE 'UTC') < 14
      THEN '09:00'
    WHEN EXTRACT(HOUR FROM date_debut AT TIME ZONE 'UTC') >= 14 THEN '14:00'
    ELSE '09:00'
  END,
  heure_fin = CASE
    WHEN EXTRACT(HOUR FROM date_fin AT TIME ZONE 'UTC') <= 13
      AND EXTRACT(HOUR FROM date_debut AT TIME ZONE 'UTC') < 14
      THEN '13:00'
    WHEN EXTRACT(HOUR FROM date_debut AT TIME ZONE 'UTC') >= 14 THEN '18:00'
    ELSE '18:00'
  END
WHERE creneau IS NULL OR creneau = '' OR creneau = 'journee';

COMMENT ON COLUMN public.reservations_infrastructure.creneau IS 'matin | apres_midi | journee';

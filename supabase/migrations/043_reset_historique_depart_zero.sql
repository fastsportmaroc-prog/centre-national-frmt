-- FRMT - Remise a zero de l'historique (fin des donnees de test)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'historique'
  ) THEN
    EXECUTE 'DELETE FROM public.historique';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) THEN
    EXECUTE 'DELETE FROM public.audit_logs';
  END IF;
END $$;

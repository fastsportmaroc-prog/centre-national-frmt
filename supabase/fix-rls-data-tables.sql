-- fix-rls-data-tables.sql
-- Policies lecture/écriture pour utilisateurs authentifiés (app FRMT)
-- Exécuter dans Supabase Studio → SQL Editor → Run

-- stages_programme (table principale de l'app — pas la table simplifiée `stages`)
ALTER TABLE public.stages_programme ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stages_programme_auth" ON public.stages_programme;
CREATE POLICY "stages_programme_auth" ON public.stages_programme
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tables liées au hub stage
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'joueurs','entraineurs','infrastructures','reservations_infrastructure',
    'besoins_restauration','hebergements','hebergements_stage','historique','occupation_cne',
    'reservations','planning','restaurations','stage_joueurs','stage_coachs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_auth" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_auth" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t, t
    );
  END LOOP;
END $$;

-- Table simplifiée stages (optionnelle — sync manuelle si utilisée)
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stages_auth" ON public.stages;
CREATE POLICY "stages_auth" ON public.stages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

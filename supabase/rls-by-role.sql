-- rls-by-role.sql
-- À exécuter dans Supabase Studio après fix-profiles-roles.sql

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT role FROM public.profiles WHERE id = auth.uid() AND coalesce(actif, true)),
    'viewer'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- ─── STAGES ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "stages_select" ON public.stages_programme;
DROP POLICY IF EXISTS "stages_insert" ON public.stages_programme;
DROP POLICY IF EXISTS "stages_update" ON public.stages_programme;
DROP POLICY IF EXISTS "stages_delete" ON public.stages_programme;
DROP POLICY IF EXISTS "stages_programme_auth" ON public.stages_programme;

CREATE POLICY "stages_select" ON public.stages_programme
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stages_insert" ON public.stages_programme
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'entraineur'));

CREATE POLICY "stages_update" ON public.stages_programme
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'entraineur'));

CREATE POLICY "stages_delete" ON public.stages_programme
  FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin');

-- ─── HÉBERGEMENTS ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hebergements_select" ON public.hebergements;
DROP POLICY IF EXISTS "hebergements_write" ON public.hebergements;

CREATE POLICY "hebergements_select" ON public.hebergements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "hebergements_write" ON public.hebergements
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('admin', 'entraineur'))
  WITH CHECK (public.get_user_role() IN ('admin', 'entraineur'));

-- ─── RESTAURATIONS ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "restaurations_select" ON public.restauration_stages;
DROP POLICY IF EXISTS "restaurations_write" ON public.restauration_stages;
DROP POLICY IF EXISTS "restaurations_select" ON public.restaurations;
DROP POLICY IF EXISTS "restaurations_write" ON public.restaurations;

CREATE POLICY "restaurations_select" ON public.restaurations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "restaurations_write" ON public.restaurations
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('admin', 'entraineur'))
  WITH CHECK (public.get_user_role() IN ('admin', 'entraineur'));

-- ─── PLANNING ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "planning_select" ON public.planning_seances;
DROP POLICY IF EXISTS "planning_write" ON public.planning_seances;

CREATE POLICY "planning_select" ON public.planning_seances
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "planning_write" ON public.planning_seances
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('admin', 'entraineur'))
  WITH CHECK (public.get_user_role() IN ('admin', 'entraineur'));

-- ─── RÉSERVATIONS ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "reservations_select" ON public.reservations_infrastructure;
DROP POLICY IF EXISTS "reservations_write" ON public.reservations_infrastructure;

CREATE POLICY "reservations_select" ON public.reservations_infrastructure
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reservations_write" ON public.reservations_infrastructure
  FOR ALL TO authenticated
  USING (public.get_user_role() IN ('admin', 'entraineur'))
  WITH CHECK (public.get_user_role() IN ('admin', 'entraineur'));

-- ─── BUDGET PRÉVISIONNEL ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "budget_select" ON public.budget_previsionnel;
DROP POLICY IF EXISTS "budget_write" ON public.budget_previsionnel;

CREATE POLICY "budget_select" ON public.budget_previsionnel
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'direction'));

CREATE POLICY "budget_write" ON public.budget_previsionnel
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ─── HISTORIQUE (lecture admin/direction, insert système authentifié) ───
DROP POLICY IF EXISTS "historique_select" ON public.historique;
DROP POLICY IF EXISTS "historique_insert" ON public.historique;

CREATE POLICY "historique_select" ON public.historique
  FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'direction'));

CREATE POLICY "historique_insert" ON public.historique
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Pas de DELETE sur historique (logs permanents)

-- ─── PARTICIPANTS STAGE (stage_joueurs / stage_coachs) ───────────────────
DROP POLICY IF EXISTS "auth_full_stage_joueurs" ON public.stage_joueurs;
DROP POLICY IF EXISTS "stage_joueurs_auth" ON public.stage_joueurs;
DROP POLICY IF EXISTS "stage_joueurs_select" ON public.stage_joueurs;
DROP POLICY IF EXISTS "stage_joueurs_write" ON public.stage_joueurs;
DROP POLICY IF EXISTS "stage_joueurs_update" ON public.stage_joueurs;
DROP POLICY IF EXISTS "stage_joueurs_delete" ON public.stage_joueurs;

CREATE POLICY "stage_joueurs_select" ON public.stage_joueurs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stage_joueurs_write" ON public.stage_joueurs
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'entraineur', 'direction', 'viewer'));

CREATE POLICY "stage_joueurs_update" ON public.stage_joueurs
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'entraineur', 'direction', 'viewer'))
  WITH CHECK (public.get_user_role() IN ('admin', 'entraineur', 'direction', 'viewer'));

CREATE POLICY "stage_joueurs_delete" ON public.stage_joueurs
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('admin', 'entraineur', 'direction', 'viewer'));

DROP POLICY IF EXISTS "auth_full_stage_coachs" ON public.stage_coachs;
DROP POLICY IF EXISTS "stage_coachs_auth" ON public.stage_coachs;
DROP POLICY IF EXISTS "stage_coachs_select" ON public.stage_coachs;
DROP POLICY IF EXISTS "stage_coachs_write" ON public.stage_coachs;
DROP POLICY IF EXISTS "stage_coachs_update" ON public.stage_coachs;
DROP POLICY IF EXISTS "stage_coachs_delete" ON public.stage_coachs;

CREATE POLICY "stage_coachs_select" ON public.stage_coachs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "stage_coachs_write" ON public.stage_coachs
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'entraineur', 'direction', 'viewer'));

CREATE POLICY "stage_coachs_update" ON public.stage_coachs
  FOR UPDATE TO authenticated
  USING (public.get_user_role() IN ('admin', 'entraineur', 'direction', 'viewer'))
  WITH CHECK (public.get_user_role() IN ('admin', 'entraineur', 'direction', 'viewer'));

CREATE POLICY "stage_coachs_delete" ON public.stage_coachs
  FOR DELETE TO authenticated
  USING (public.get_user_role() IN ('admin', 'entraineur', 'direction', 'viewer'));

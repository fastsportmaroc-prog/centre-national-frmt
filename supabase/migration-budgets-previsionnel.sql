-- =============================================================================
-- migration-budgets-previsionnel.sql
-- À exécuter dans Supabase Studio → SQL Editor → Run
--
-- IMPORTANT : ce script correspond au schéma utilisé par l'application
-- (lib/data/budget-previsionnel.ts). Il crée public.budgets_previsionnel
-- avec toutes les colonnes attendues (objet, lignes JSONB, etc.).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.budgets_previsionnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objet TEXT NOT NULL,
  type_budget TEXT NOT NULL DEFAULT 'mission',
  sujet_libelle TEXT NOT NULL DEFAULT '',
  avec_coach BOOLEAN NOT NULL DEFAULT false,
  coach_nom TEXT,
  tournoi_evenement TEXT,
  pays TEXT,
  ville TEXT,
  date_debut DATE NOT NULL DEFAULT CURRENT_DATE,
  date_fin DATE NOT NULL DEFAULT CURRENT_DATE,
  nombre_personnes INT NOT NULL DEFAULT 1,
  devise TEXT NOT NULL DEFAULT 'EUR',
  taux_mad NUMERIC(10, 4) NOT NULL DEFAULT 10.80,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  joueur_id UUID,
  entraineur_id UUID,
  stage_id UUID REFERENCES public.stages_programme(id) ON DELETE SET NULL,
  equipe_libelle TEXT,
  sous_total_eur NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_eur NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_mad NUMERIC(14, 2) NOT NULL DEFAULT 0,
  montant_lettres_mad TEXT,
  lignes JSONB NOT NULL DEFAULT '[]'::jsonb,
  participants JSONB NOT NULL DEFAULT '{"joueur_ids":[],"coach_ids":[]}'::jsonb,
  signataires JSONB NOT NULL DEFAULT '[]'::jsonb,
  dernier_export_pdf_at TIMESTAMPTZ,
  created_by TEXT NOT NULL DEFAULT 'system',
  updated_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK optionnelles (si tables présentes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'joueurs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'budgets_previsionnel_joueur_id_fkey') THEN
    ALTER TABLE public.budgets_previsionnel
      ADD CONSTRAINT budgets_previsionnel_joueur_id_fkey
      FOREIGN KEY (joueur_id) REFERENCES public.joueurs(id) ON DELETE SET NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'entraineurs')
     AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'budgets_previsionnel_entraineur_id_fkey') THEN
    ALTER TABLE public.budgets_previsionnel
      ADD CONSTRAINT budgets_previsionnel_entraineur_id_fkey
      FOREIGN KEY (entraineur_id) REFERENCES public.entraineurs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_budgets_previsionnel_statut ON public.budgets_previsionnel(statut);
CREATE INDEX IF NOT EXISTS idx_budgets_previsionnel_dates ON public.budgets_previsionnel(date_debut, date_fin);
CREATE INDEX IF NOT EXISTS idx_budgets_previsionnel_stage ON public.budgets_previsionnel(stage_id);

ALTER TABLE public.budgets_previsionnel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budgets_previsionnel_auth" ON public.budgets_previsionnel;
DROP POLICY IF EXISTS "budgets_auth" ON public.budgets_previsionnel;

CREATE POLICY "budgets_previsionnel_auth" ON public.budgets_previsionnel
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Historique (optionnel — ignoré si absent côté app)
CREATE TABLE IF NOT EXISTS public.budget_previsionnel_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES public.budgets_previsionnel(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  utilisateur TEXT NOT NULL DEFAULT 'system',
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_previsionnel_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "budget_previsionnel_history_auth" ON public.budget_previsionnel_history;
CREATE POLICY "budget_previsionnel_history_auth" ON public.budget_previsionnel_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

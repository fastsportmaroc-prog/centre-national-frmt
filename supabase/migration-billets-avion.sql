-- migration-billets-avion.sql
-- À exécuter manuellement dans Supabase Studio → SQL Editor → Run
-- NE PAS exécuter automatiquement depuis l'app

CREATE TABLE IF NOT EXISTS demandes_billet_avion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID REFERENCES stages_programme(id) ON DELETE CASCADE,
  personne_id UUID,
  personne_type TEXT,
  personne_nom TEXT,
  personne_prenom TEXT,
  aeroport_depart TEXT,
  date_depart DATE,
  heure_depart TIME,
  aeroport_retour TEXT,
  date_retour DATE,
  heure_retour TIME,
  prix_unitaire NUMERIC(10,2),
  devise TEXT DEFAULT 'EUR',
  statut TEXT DEFAULT 'demande',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE demandes_billet_avion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "billets_auth" ON demandes_billet_avion;
CREATE POLICY "billets_auth" ON demandes_billet_avion
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Colonne stage_id sur hebergements si absente (hébergement lié au stage)
ALTER TABLE public.hebergements ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES stages_programme(id) ON DELETE CASCADE;
ALTER TABLE public.hebergements ADD COLUMN IF NOT EXISTS date_debut DATE;
ALTER TABLE public.hebergements ADD COLUMN IF NOT EXISTS date_fin DATE;
ALTER TABLE public.hebergements ADD COLUMN IF NOT EXISTS type_chambre_joueurs TEXT;
ALTER TABLE public.hebergements ADD COLUMN IF NOT EXISTS type_chambre_coachs TEXT;
ALTER TABLE public.hebergements ADD COLUMN IF NOT EXISTS nb_chambres_joueurs INTEGER DEFAULT 0;
ALTER TABLE public.hebergements ADD COLUMN IF NOT EXISTS nb_chambres_coachs INTEGER DEFAULT 0;
ALTER TABLE public.hebergements ADD COLUMN IF NOT EXISTS kitchenette BOOLEAN DEFAULT false;
ALTER TABLE public.hebergements ADD COLUMN IF NOT EXISTS remarques TEXT;
ALTER TABLE public.hebergements ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'prevu';

-- Pivot stage_joueurs / stage_coachs → stages_programme si FK sur stages simplifiée
-- (Exécuter seulement si vos pivots pointent encore vers `stages`)
-- ALTER TABLE stage_joueurs DROP CONSTRAINT IF EXISTS stage_joueurs_stage_id_fkey;
-- ALTER TABLE stage_coachs DROP CONSTRAINT IF EXISTS stage_coachs_stage_id_fkey;

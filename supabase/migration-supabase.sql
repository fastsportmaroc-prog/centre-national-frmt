-- migration-supabase.sql
-- Schéma stages FRMT — NON destructif (CREATE IF NOT EXISTS)
-- Exécuter dans Supabase Studio → SQL Editor → Run
-- NOTE: L'app Next.js utilise aussi stages_programme (migrations existantes).
--       Ce fichier ajoute le schéma simplifié demandé + tables pivot.

-- STAGES
CREATE TABLE IF NOT EXISTS stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  categorie TEXT,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  lieu TEXT,
  statut TEXT DEFAULT 'prevu',
  notes TEXT,
  hebergement BOOLEAN DEFAULT false,
  restauration BOOLEAN DEFAULT false,
  terrains BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- JOUEURS
CREATE TABLE IF NOT EXISTS joueurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  categorie TEXT,
  date_naissance DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- COACHS
CREATE TABLE IF NOT EXISTS coachs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  specialite TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PIVOTS
CREATE TABLE IF NOT EXISTS stage_joueurs (
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  joueur_id UUID REFERENCES joueurs(id) ON DELETE CASCADE,
  PRIMARY KEY (stage_id, joueur_id)
);

CREATE TABLE IF NOT EXISTS stage_coachs (
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES coachs(id) ON DELETE CASCADE,
  PRIMARY KEY (stage_id, coach_id)
);

-- HÉBERGEMENT (par stage)
CREATE TABLE IF NOT EXISTS hebergements_stage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  date_debut DATE,
  date_fin DATE,
  type_chambre_joueurs TEXT,
  type_chambre_coachs TEXT,
  nb_chambres_joueurs INTEGER DEFAULT 0,
  nb_chambres_coachs INTEGER DEFAULT 0,
  kitchenette BOOLEAN DEFAULT false,
  remarques TEXT,
  statut TEXT DEFAULT 'prevu',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RESTAURATION (par stage)
CREATE TABLE IF NOT EXISTS restaurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  petit_dejeuner BOOLEAN DEFAULT false,
  dejeuner BOOLEAN DEFAULT false,
  diner BOOLEAN DEFAULT false,
  date_debut DATE,
  date_fin DATE,
  nb_personnes INTEGER DEFAULT 0,
  total_repas INTEGER DEFAULT 0,
  remarques TEXT,
  statut TEXT DEFAULT 'prevu',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- INFRASTRUCTURES
CREATE TABLE IF NOT EXISTS infrastructures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  type TEXT,
  surface TEXT,
  capacite INTEGER DEFAULT 1,
  statut TEXT DEFAULT 'disponible',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PLANNING
CREATE TABLE IF NOT EXISTS planning (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID REFERENCES stages(id) ON DELETE CASCADE,
  date DATE,
  heure_debut TIME,
  heure_fin TIME,
  infrastructure_id UUID REFERENCES infrastructures(id),
  surface TEXT,
  coach_id UUID REFERENCES coachs(id),
  groupe TEXT,
  statut TEXT DEFAULT 'prevu',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HISTORIQUE
CREATE TABLE IF NOT EXISTS historique (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  description TEXT,
  ancienne_valeur JSONB,
  nouvelle_valeur JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS : activer sur toutes les tables
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE joueurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coachs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_joueurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_coachs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hebergements_stage ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructures ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE historique ENABLE ROW LEVEL SECURITY;

-- POLICIES : accès authentifié uniquement
DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'stages','joueurs','coachs','stage_joueurs','stage_coachs',
    'hebergements_stage','restaurations','infrastructures','planning','historique'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "auth_full_%s" ON %I;
       CREATE POLICY "auth_full_%s" ON %I
       FOR ALL USING (auth.role() = ''authenticated'')', t, t, t, t);
  END LOOP;
END $$;

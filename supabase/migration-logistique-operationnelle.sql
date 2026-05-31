-- Système logistique opérationnel FRMT (à exécuter manuellement dans Supabase Studio)
-- Ne pas exécuter automatiquement depuis l'app.

-- Chambres internes
CREATE TABLE IF NOT EXISTS interne_chambres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  batiment TEXT NOT NULL,
  type TEXT DEFAULT 'simple',
  genre TEXT,
  capacite INTEGER DEFAULT 1,
  statut TEXT DEFAULT 'libre',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Occupations chambres
CREATE TABLE IF NOT EXISTS occupations_chambre (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chambre_id UUID REFERENCES interne_chambres(id),
  occupant_id UUID,
  occupant_type TEXT,
  occupant_nom TEXT,
  stage_id UUID REFERENCES stages_programme(id) ON DELETE CASCADE,
  date_arrivee DATE,
  date_depart DATE,
  statut TEXT DEFAULT 'confirme',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Présences repas
CREATE TABLE IF NOT EXISTS presences_repas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID REFERENCES stages_programme(id) ON DELETE CASCADE,
  personne_id UUID,
  personne_type TEXT,
  personne_nom TEXT,
  date_repas DATE,
  petit_dejeuner BOOLEAN DEFAULT false,
  dejeuner BOOLEAN DEFAULT false,
  diner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stage_id, personne_id, date_repas)
);

-- Facturation Club Agriculture
CREATE TABLE IF NOT EXISTS factures_club (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID REFERENCES stages_programme(id),
  montant_hebergement NUMERIC(10,2) DEFAULT 0,
  montant_restauration NUMERIC(10,2) DEFAULT 0,
  montant_terrains NUMERIC(10,2) DEFAULT 0,
  montant_total NUMERIC(10,2) DEFAULT 0,
  statut TEXT DEFAULT 'brouillon',
  date_emission DATE,
  date_paiement DATE,
  reference_paiement TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rapports logistique
CREATE TABLE IF NOT EXISTS rapports_logistique (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'stage'|'hebdo'|'mensuel'
  periode_debut DATE,
  periode_fin DATE,
  stage_id UUID REFERENCES stages_programme(id),
  contenu JSONB,
  observations TEXT,
  recommandations TEXT,
  statut TEXT DEFAULT 'brouillon',
  envoye_dtn BOOLEAN DEFAULT false,
  envoye_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE interne_chambres ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupations_chambre ENABLE ROW LEVEL SECURITY;
ALTER TABLE presences_repas ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures_club ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapports_logistique ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chambres_auth" ON interne_chambres;
DROP POLICY IF EXISTS "occupations_auth" ON occupations_chambre;
DROP POLICY IF EXISTS "repas_auth" ON presences_repas;
DROP POLICY IF EXISTS "factures_auth" ON factures_club;
DROP POLICY IF EXISTS "rapports_auth" ON rapports_logistique;

CREATE POLICY "chambres_auth" ON interne_chambres
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "occupations_auth" ON occupations_chambre
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "repas_auth" ON presences_repas
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "factures_auth" ON factures_club
  FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "rapports_auth" ON rapports_logistique
  FOR ALL USING (auth.role() = 'authenticated');


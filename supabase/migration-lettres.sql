-- Migration lettres officielles — exécuter dans Supabase Studio (ne pas lancer depuis l'app)

CREATE TABLE IF NOT EXISTS lettres_officielles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID REFERENCES stages_programme(id) ON DELETE CASCADE,
  club_destinataire TEXT,
  date_lettre DATE DEFAULT CURRENT_DATE,
  type TEXT DEFAULT 'reservation',
  avec_hebergement BOOLEAN DEFAULT false,
  avec_terrains BOOLEAN DEFAULT true,
  participants JSONB,
  exceptions_hebergement JSONB,
  contenu_personnalise TEXT,
  statut TEXT DEFAULT 'generee',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lettres_officielles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lettres_auth" ON lettres_officielles;
CREATE POLICY "lettres_auth" ON lettres_officielles
  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_lettres_stage_id ON lettres_officielles(stage_id);
CREATE INDEX IF NOT EXISTS idx_lettres_created_at ON lettres_officielles(created_at DESC);

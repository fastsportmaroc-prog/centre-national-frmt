-- migration-historique-v2.sql
-- À exécuter dans Supabase Studio

ALTER TABLE public.historique
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_nom TEXT,
  ADD COLUMN IF NOT EXISTS user_role TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS table_concernee TEXT,
  ADD COLUMN IF NOT EXISTS record_id UUID,
  ADD COLUMN IF NOT EXISTS ancienne_valeur JSONB,
  ADD COLUMN IF NOT EXISTS nouvelle_valeur JSONB,
  ADD COLUMN IF NOT EXISTS diff JSONB;

CREATE INDEX IF NOT EXISTS idx_historique_user ON public.historique(user_id);
CREATE INDEX IF NOT EXISTS idx_historique_table ON public.historique(table_concernee);
CREATE INDEX IF NOT EXISTS idx_historique_created ON public.historique(created_at DESC);

COMMENT ON COLUMN public.historique.diff IS 'Champs modifiés { key: { avant, apres } }';

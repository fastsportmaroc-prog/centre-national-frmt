-- migration-alerts.sql
-- À exécuter dans Supabase Studio

CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'danger')),
  title TEXT NOT NULL,
  message TEXT,
  stage_id UUID REFERENCES public.stages_programme(id) ON DELETE CASCADE,
  href TEXT,
  lu BOOLEAN NOT NULL DEFAULT false,
  lu_par UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lu_at TIMESTAMPTZ,
  dedupe_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_dedupe
  ON public.alerts(dedupe_key)
  WHERE dedupe_key IS NOT NULL AND lu = false;

CREATE INDEX IF NOT EXISTS idx_alerts_lu ON public.alerts(lu, created_at DESC);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_select" ON public.alerts;
DROP POLICY IF EXISTS "alerts_update" ON public.alerts;
DROP POLICY IF EXISTS "alerts_insert" ON public.alerts;

CREATE POLICY "alerts_select" ON public.alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "alerts_update" ON public.alerts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "alerts_insert" ON public.alerts
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'entraineur', 'direction'));

-- Realtime (activer la publication dans Dashboard → Database → Replication si besoin)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

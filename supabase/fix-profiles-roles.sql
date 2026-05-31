-- fix-profiles-roles.sql
-- À exécuter dans Supabase Studio → SQL Editor (NE PAS exécuter depuis l'app)
-- Étend profiles pour rôles Centre National FRMT

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nom TEXT,
  ADD COLUMN IF NOT EXISTS prenom TEXT,
  ADD COLUMN IF NOT EXISTS entraineur_id UUID REFERENCES public.entraineurs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;

-- role applicatif (distinct de staff/admin legacy si présent)
-- Si la colonne role existe déjà avec check (admin, staff), migrer vers les nouveaux rôles :
UPDATE public.profiles SET role = 'viewer' WHERE role = 'staff';
UPDATE public.profiles SET role = 'admin' WHERE role = 'admin';
UPDATE public.profiles SET role = 'direction' WHERE frmt_role = 'directeur' AND role NOT IN ('admin','entraineur','coach','viewer','direction');
UPDATE public.profiles SET role = 'entraineur' WHERE frmt_role = 'entraineur' AND role NOT IN ('admin','entraineur','coach','viewer','direction');

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'viewer';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'entraineur', 'coach', 'viewer', 'direction'));

-- Index entraîneur lié
CREATE INDEX IF NOT EXISTS idx_profiles_entraineur ON public.profiles(entraineur_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Admin peut lire / modifier tous les profils (sans récursion : via security definer)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin' AND coalesce(p.actif, true)
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin_user());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin_user())
  WITH CHECK (auth.uid() = id OR public.is_admin_user());

COMMENT ON COLUMN public.profiles.role IS 'admin | entraineur | coach | viewer | direction';

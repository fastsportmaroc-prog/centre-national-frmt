-- =============================================================================
-- FRMT — Réparer profiles + compte admin (à exécuter EN ENTIER dans SQL Editor)
-- Corrige : column "frmt_role" does not exist
-- =============================================================================

-- 0) Colonnes manquantes sur public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nom TEXT,
  ADD COLUMN IF NOT EXISTS prenom TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS entraineur_id UUID,
  ADD COLUMN IF NOT EXISTS frmt_role TEXT DEFAULT 'directeur';

-- 1) Contrainte role (valeurs V2 : admin, entraineur, coach, viewer, direction)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE public.profiles SET role = 'viewer' WHERE role IS NULL OR trim(role) = '';
UPDATE public.profiles SET role = 'viewer' WHERE role IN ('staff', 'joueur', 'logisticien', 'user');
UPDATE public.profiles SET role = 'admin' WHERE lower(role) = 'admin';
UPDATE public.profiles SET role = 'direction' WHERE role IN ('directeur', 'direction');
UPDATE public.profiles SET role = 'entraineur' WHERE lower(role) = 'entraineur';
UPDATE public.profiles SET role = 'coach' WHERE lower(role) = 'coach';

UPDATE public.profiles
SET role = 'viewer'
WHERE role NOT IN ('admin', 'entraineur', 'coach', 'viewer', 'direction');

ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'viewer';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'entraineur', 'coach', 'viewer', 'direction'));

-- 2) Profils manquants pour les comptes Auth
INSERT INTO public.profiles (id, email, full_name, role, frmt_role, actif)
SELECT
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  coalesce(nullif(u.raw_user_meta_data->>'role', ''), 'viewer'),
  coalesce(nullif(u.raw_user_meta_data->>'frmt_role', ''), 'directeur'),
  true
FROM auth.users u
WHERE u.email IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- 3) Comptes administrateurs principaux (accès total)
UPDATE public.profiles
SET role = 'admin', frmt_role = 'admin', actif = true
WHERE lower(email) IN (lower('s.abderrazzaq@frmt.ma'), lower('m.aitbarhouch@frmt.ma'))
   OR id IN (
     SELECT id FROM auth.users
     WHERE lower(email) IN (lower('s.abderrazzaq@frmt.ma'), lower('m.aitbarhouch@frmt.ma'))
   );

-- 4) Vérification
SELECT id, email, role, frmt_role, actif
FROM public.profiles
WHERE lower(email) LIKE '%frmt.ma%'
ORDER BY email;

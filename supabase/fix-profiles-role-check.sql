-- Corrige l'erreur 23514 profiles_role_check + colonnes manquantes
-- Exécuter EN ENTIER dans Supabase Studio → SQL Editor → Run

-- 0) Colonnes optionnelles (si pas encore créées)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nom TEXT,
  ADD COLUMN IF NOT EXISTS prenom TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS entraineur_id UUID;

-- 1) Supprimer l'ancienne contrainte AVANT toute mise à jour
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2) Normaliser toutes les valeurs role existantes
UPDATE public.profiles SET role = 'viewer' WHERE role IS NULL OR trim(role) = '';
UPDATE public.profiles SET role = 'viewer' WHERE role IN ('staff', 'joueur', 'logisticien', 'user');
UPDATE public.profiles SET role = 'admin' WHERE role = 'admin';
UPDATE public.profiles SET role = 'direction' WHERE role IN ('directeur', 'direction');
UPDATE public.profiles SET role = 'entraineur' WHERE role = 'entraineur';
UPDATE public.profiles SET role = 'coach' WHERE role = 'coach';

-- frmt_role legacy (si colonne présente)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'frmt_role'
  ) THEN
    UPDATE public.profiles SET role = 'direction'
    WHERE frmt_role IN ('directeur', 'direction')
      AND role NOT IN ('admin', 'entraineur', 'coach', 'viewer', 'direction');

    UPDATE public.profiles SET role = 'entraineur'
    WHERE frmt_role = 'entraineur'
      AND role NOT IN ('admin', 'entraineur', 'coach', 'viewer', 'direction');
  END IF;
END $$;

-- Tout le reste → viewer (sécurité)
UPDATE public.profiles
SET role = 'viewer'
WHERE role IS NULL
   OR role NOT IN ('admin', 'entraineur', 'coach', 'viewer', 'direction');

-- 3) Recréer la contrainte
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'viewer';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'entraineur', 'coach', 'viewer', 'direction'));

-- 4) Votre compte en admin (adapter l'email)
UPDATE public.profiles
SET role = 'admin', actif = true
WHERE email = 'm.aitbarhouch@frmt.ma';

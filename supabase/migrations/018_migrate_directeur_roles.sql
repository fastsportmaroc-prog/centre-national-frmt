-- Migration rôles FRMT V2 — suppression du rôle legacy "directeur"
-- Table : public.profiles (colonne principale : role)
-- Exécuter dans Supabase Studio → SQL Editor

-- ─── État AVANT (lecture) ───────────────────────────────────────────────────
SELECT id, email, role, actif
FROM public.profiles
WHERE lower(email) IN ('m.aitbarhouch@frmt.ma', 's.abderrazzaq@frmt.ma')
   OR role = 'directeur'
ORDER BY email;

-- ─── 1. Promouvoir les deux administrateurs ───────────────────────────────
UPDATE public.profiles
SET role = 'admin', actif = true
WHERE lower(email) IN ('m.aitbarhouch@frmt.ma', 's.abderrazzaq@frmt.ma');
-- ─── 2. Remplacer directeur → direction (rôle standard V2) ─────────────────
UPDATE public.profiles
SET role = 'direction'
WHERE role = 'directeur'
  AND lower(email) NOT IN ('m.aitbarhouch@frmt.ma', 's.abderrazzaq@frmt.ma');

-- ─── État APRÈS (vérification) ─────────────────────────────────────────────
SELECT id, email, role, actif
FROM public.profiles
WHERE lower(email) IN ('m.aitbarhouch@frmt.ma', 's.abderrazzaq@frmt.ma')
ORDER BY email;

SELECT count(*) AS directeur_restants FROM public.profiles WHERE role = 'directeur';

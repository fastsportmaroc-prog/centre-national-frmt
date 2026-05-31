-- fix-rls-profiles.sql
-- Corrige les policies récursives sur profiles
-- Exécuter dans Supabase Studio → SQL Editor → Run

-- Supprimer la policy récursive
DROP POLICY IF EXISTS "profiles_policy" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Recréer une policy propre sans récursion
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

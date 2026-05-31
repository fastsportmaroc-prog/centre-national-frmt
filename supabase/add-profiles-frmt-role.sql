-- Uniquement si vous avez l'erreur : column "frmt_role" does not exist
-- Exécuter ce fichier AVANT les autres scripts qui utilisent frmt_role.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS frmt_role TEXT DEFAULT 'directeur';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.profiles.frmt_role IS 'Rôle métier FRMT : admin, directeur, entraineur, logisticien, joueur';

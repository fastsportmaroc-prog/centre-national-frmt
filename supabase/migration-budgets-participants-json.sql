-- Optionnel si la table budgets_previsionnel existe déjà sans colonne participants
-- Supabase Studio → SQL Editor → Run

ALTER TABLE public.budgets_previsionnel
  ADD COLUMN IF NOT EXISTS participants JSONB NOT NULL DEFAULT '{"joueur_ids":[],"coach_ids":[]}'::jsonb;

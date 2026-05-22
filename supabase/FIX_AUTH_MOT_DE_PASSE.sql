-- FRMT : aide connexion (NON destructif — pas de DELETE, pas de DROP)
-- Executer dans Supabase SQL Editor du projet kcwvqwvcyiiwalyvhvxz

-- 1) Verifier les utilisateurs auth (lecture seule)
select id, email, email_confirmed_at, created_at
from auth.users
order by created_at desc
limit 20;

-- 2) Si email_confirmed_at est NULL, confirmer manuellement (remplacer l'email)
-- update auth.users
-- set email_confirmed_at = now()
-- where email = 's.abderrazzaq@frmt.ma';

-- 3) Profil public lie (optionnel)
-- select * from public.profiles where email ilike '%frmt%';

-- Vider les infrastructures existantes (données de test incluses)
truncate table public.infrastructures cascade;

-- Insérer les 8 infrastructures réelles du CNE
insert into public.infrastructures (nom, type, surface, capacite, actif, statut)
values
  -- TERRE BATTUE
  ('Court 1 — Terre Battue', 'court-tennis', 'terre-battue', 4, true, 'disponible'),
  ('Court 2 — Terre Battue', 'court-tennis', 'terre-battue', 4, true, 'disponible'),
  ('Court 3 — Terre Battue', 'court-tennis', 'terre-battue', 4, true, 'disponible'),
  -- DUR
  ('Court 4 — Surface Dure', 'court-tennis', 'dur', 4, true, 'disponible'),
  ('Court 5 — Surface Dure', 'court-tennis', 'dur', 4, true, 'disponible'),
  -- ESPACES
  ('Espace Physique', 'salle-fitness', 'intérieur', 20, true, 'disponible'),
  ('Espace Natation', 'piscine', 'eau', 15, true, 'disponible'),
  ('Salle de Gym', 'gymnase', 'intérieur', 30, true, 'disponible');

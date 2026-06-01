-- FRMT — Admins permanents (m.aitbarhouch, s.abderrazzaq) + RLS cohérent

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (
      SELECT CASE
        WHEN lower(coalesce(p.email, u.email::text)) IN (
          's.abderrazzaq@frmt.ma',
          'm.aitbarhouch@frmt.ma',
          'admin@frmt.ma',
          'directeur@frmt.ma'
        ) THEN 'admin'
        WHEN p.role IN ('admin', 'entraineur', 'coach', 'viewer', 'direction') THEN p.role
        ELSE 'viewer'
      END
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id AND coalesce(p.actif, true)
      WHERE u.id = auth.uid()
    ),
    'viewer'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- Profils admin pour les comptes principaux
UPDATE public.profiles
SET
  role = 'admin',
  frmt_role = 'admin',
  actif = true
WHERE lower(email) IN (
  lower('s.abderrazzaq@frmt.ma'),
  lower('m.aitbarhouch@frmt.ma')
)
   OR id IN (
     SELECT id FROM auth.users
     WHERE lower(email) IN (
       lower('s.abderrazzaq@frmt.ma'),
       lower('m.aitbarhouch@frmt.ma')
     )
   );

-- Autoriser abdou@frmt.ma comme administrateur permanent

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
          'directeur@frmt.ma',
          'abdou@frmt.ma'
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

INSERT INTO public.profiles (id, email, full_name, role, frmt_role, actif)
SELECT
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', 'Abdou'),
  'admin',
  'admin',
  true
FROM auth.users u
WHERE lower(u.email) = lower('abdou@frmt.ma')
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  frmt_role = 'admin',
  actif = true;

-- Aligner is_current_user_admin sur les superadmins permanents (incl. abdou@frmt.ma)

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE u.id = auth.uid()
      AND (
        lower(coalesce(p.email, u.email::text)) IN (
          's.abderrazzaq@frmt.ma',
          'm.aitbarhouch@frmt.ma',
          'admin@frmt.ma',
          'directeur@frmt.ma',
          'abdou@frmt.ma'
        )
        OR lower(coalesce(p.role, '')) = 'admin'
        OR lower(coalesce(p.frmt_role, '')) = 'admin'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

DELETE FROM public.user_permissions
WHERE user_id IN (
  SELECT id FROM auth.users WHERE lower(email) = lower('abdou@frmt.ma')
);

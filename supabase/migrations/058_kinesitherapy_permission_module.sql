-- 058_kinesitherapy_permission_module.sql
-- Rubrique Kinésithérapie distincte de Planning dans user_permissions.

alter table public.user_permissions
  drop constraint if exists user_permissions_module_key_check;

alter table public.user_permissions
  add constraint user_permissions_module_key_check check (
    module_key in (
      'dashboard', 'players', 'coaches', 'stages', 'planning', 'kinesitherapy',
      'accommodation', 'catering', 'courts', 'equipment', 'documents',
      'budgets', 'passports_visas', 'history', 'reports', 'settings'
    )
  );

notify pgrst, 'reload schema';

"use client";

import type { AppRole } from "@/lib/types/app-roles";
import type { PermissionModuleKey } from "@/lib/types/user-permissions";
import { useRole } from "@/lib/hooks/useRole";
import { useAuth } from "@/components/auth/AuthProvider";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { useUserPermissions } from "@/lib/hooks/useUserPermissions";

type Props = {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requiredModule?: PermissionModuleKey;
  fallback?: React.ReactNode;
};

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredModule,
  fallback = <AccessDenied />,
}: Props) {
  const { role, loading } = useRole();
  const { user } = useAuth();
  const { loading: permLoading, canView, isAdmin } = useUserPermissions();

  if (loading || permLoading) {
    return <p className="p-8 text-center text-sm text-muted">Vérification des droits…</p>;
  }

  if (requiredModule && !isAdmin && !canView(requiredModule)) {
    return fallback;
  }

  if (allowedRoles) {
    const effectiveRole = user ? resolveEffectiveAppRole(user) : role;
    if (!allowedRoles.includes(effectiveRole)) return fallback;
  }

  return <>{children}</>;
}

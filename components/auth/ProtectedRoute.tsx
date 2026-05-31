"use client";

import type { AppRole } from "@/lib/types/app-roles";
import { useRole } from "@/lib/hooks/useRole";
import { useAuth } from "@/components/auth/AuthProvider";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import { AccessDenied } from "@/components/auth/AccessDenied";

type Props = {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  fallback?: React.ReactNode;
};

export function ProtectedRoute({ children, allowedRoles, fallback = <AccessDenied /> }: Props) {
  const { role, loading } = useRole();
  const { user } = useAuth();

  if (loading) {
    return <p className="p-8 text-center text-sm text-muted">Vérification des droits…</p>;
  }

  const effectiveRole = user ? resolveEffectiveAppRole(user) : role;
  if (!allowedRoles.includes(effectiveRole)) return fallback;

  return <>{children}</>;
}

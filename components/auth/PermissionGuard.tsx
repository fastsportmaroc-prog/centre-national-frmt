"use client";

import { usePathname } from "next/navigation";
import { AccessDenied } from "@/components/auth/AccessDenied";
import { useUserPermissions } from "@/lib/hooks/useUserPermissions";
import { resolveModuleFromPath } from "@/lib/auth/module-registry";
import type { PermissionModuleKey } from "@/lib/types/user-permissions";

type Props = {
  children: React.ReactNode;
  moduleKey?: PermissionModuleKey;
  action?: "view" | "edit";
  fallback?: React.ReactNode;
};

export function PermissionGuard({
  children,
  moduleKey,
  action = "view",
  fallback = <AccessDenied />,
}: Props) {
  const pathname = usePathname();
  const { loading, canView, canEdit, canAccessPath, isAdmin } = useUserPermissions();

  // Admin : accès immédiat (évite un flash « Vérification… » qui mismatch à l’hydratation).
  if (isAdmin) return <>{children}</>;

  if (loading) {
    return <p className="p-8 text-center text-sm text-muted">Vérification des droits…</p>;
  }

  const resolvedModule = moduleKey ?? resolveModuleFromPath(pathname);
  if (!resolvedModule) {
    if (!canAccessPath(pathname, action)) return fallback;
    return <>{children}</>;
  }

  const allowed = action === "edit" ? canEdit(resolvedModule) : canView(resolvedModule);
  if (!allowed) return fallback;

  return <>{children}</>;
}

/** Garde de route globale — bloque l'accès direct par URL. */
export function V2RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, canAccessPath, isAdmin } = useUserPermissions();

  if (isAdmin) return <>{children}</>;

  if (loading) {
    return <p className="p-8 text-center text-sm text-muted">Vérification des droits…</p>;
  }

  if (!pathname.startsWith("/v2") && !pathname.startsWith("/competitions")) {
    return <>{children}</>;
  }

  if (!canAccessPath(pathname)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}

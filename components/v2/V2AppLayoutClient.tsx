"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { FrmtRoleProvider } from "@/components/auth/FrmtRoleProvider";
import { V2RouteGuard } from "@/components/auth/PermissionGuard";
import { V2Shell } from "@/components/v2/V2Shell";
import { UserPermissionsProvider } from "@/lib/hooks/useUserPermissions";
import type { AuthUser } from "@/lib/types/auth";
import type { UserPermission } from "@/lib/types/user-permissions";

type Props = {
  children: React.ReactNode;
  initialUser: AuthUser | null;
  initialPermissions?: UserPermission[];
  initialPlayerCategories?: string[];
};

export function V2AppLayoutClient({
  children,
  initialUser,
  initialPermissions = [],
  initialPlayerCategories = [],
}: Props) {
  return (
    <AuthProvider initialUser={initialUser}>
      <AuthGate>
        <FrmtRoleProvider>
          <UserPermissionsProvider
            initialPermissions={initialPermissions}
            initialPlayerCategories={initialPlayerCategories}
          >
            <V2Shell>
              <V2RouteGuard>{children}</V2RouteGuard>
            </V2Shell>
          </UserPermissionsProvider>
        </FrmtRoleProvider>
      </AuthGate>
    </AuthProvider>
  );
}

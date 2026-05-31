"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { FrmtRoleProvider } from "@/components/auth/FrmtRoleProvider";
import { V2Shell } from "@/components/v2/V2Shell";
import type { AuthUser } from "@/lib/types/auth";

type Props = {
  children: React.ReactNode;
  initialUser: AuthUser | null;
};

export function V2AppLayoutClient({ children, initialUser }: Props) {
  return (
    <AuthProvider initialUser={initialUser}>
      <AuthGate>
        <FrmtRoleProvider>
          <V2Shell>{children}</V2Shell>
        </FrmtRoleProvider>
      </AuthGate>
    </AuthProvider>
  );
}

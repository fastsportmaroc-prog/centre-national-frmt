"use client";

import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { FrmtRoleProvider } from "@/components/auth/FrmtRoleProvider";
import type { AuthUser } from "@/lib/types/auth";

type Props = {
  children: React.ReactNode;
  initialUser: AuthUser | null;
};

export function AppLayoutClient({ children, initialUser }: Props) {
  return (
    <AuthProvider initialUser={initialUser}>
      <AuthGate>
        <FrmtRoleProvider>
          <AppShell>{children}</AppShell>
        </FrmtRoleProvider>
      </AuthGate>
    </AuthProvider>
  );
}

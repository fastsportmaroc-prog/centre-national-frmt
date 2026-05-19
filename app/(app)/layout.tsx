import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthGate } from "@/components/auth/AuthGate";
import { FrmtRoleProvider } from "@/components/auth/FrmtRoleProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>
        <FrmtRoleProvider>
          <AppShell>{children}</AppShell>
        </FrmtRoleProvider>
      </AuthGate>
    </AuthProvider>
  );
}

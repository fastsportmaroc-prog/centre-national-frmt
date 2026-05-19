import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { FrmtRoleProvider } from "@/components/auth/FrmtRoleProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FrmtRoleProvider>
        <AppShell>{children}</AppShell>
      </FrmtRoleProvider>
    </AuthProvider>
  );
}

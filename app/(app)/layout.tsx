import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { AppLayoutClient } from "@/components/auth/AppLayoutClient";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getAuthUserFromServer();

  return <AppLayoutClient initialUser={initialUser}>{children}</AppLayoutClient>;
}

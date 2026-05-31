import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { V2AppLayoutClient } from "@/components/v2/V2AppLayoutClient";

export const dynamic = "force-dynamic";

export default async function V2RootLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getAuthUserFromServer();

  return <V2AppLayoutClient initialUser={initialUser}>{children}</V2AppLayoutClient>;
}

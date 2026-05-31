import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { V2AppLayoutClient } from "@/components/v2/V2AppLayoutClient";

export const dynamic = "force-dynamic";

export default async function CompetitionsLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getAuthUserFromServer();
  return <V2AppLayoutClient initialUser={initialUser}>{children}</V2AppLayoutClient>;
}

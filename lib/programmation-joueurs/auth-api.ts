import "server-only";

import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { requireModuleAccess } from "@/lib/auth/require-module-access";

export async function requireProgrammationApiUser() {
  const user = await getAuthUserFromServer();
  if (!user) return null;

  const access = await requireModuleAccess("players", "view");
  if (!access.ok) return null;

  return user;
}

import "server-only";

import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { requireModuleAccess } from "@/lib/auth/require-module-access";

export async function requireCompetitionApiUser(action: "view" | "edit" = "view") {
  const user = await getAuthUserFromServer();
  if (!user) return null;

  const access = await requireModuleAccess("stages", action);
  if (!access.ok) return null;

  return user;
}

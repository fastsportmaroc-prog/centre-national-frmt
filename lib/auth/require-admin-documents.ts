import "server-only";

import { authUserCanAccessPasseports } from "@/lib/auth/passeports-access";
import { getAuthUserFromServer } from "@/lib/auth/server-session";

export async function requireAdminDocumentsAccess() {
  const user = await getAuthUserFromServer();
  if (!user || !authUserCanAccessPasseports(user)) {
    return null;
  }
  return user;
}

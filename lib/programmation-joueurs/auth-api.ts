import "server-only";

import { getAuthUserFromServer } from "@/lib/auth/server-session";

export async function requireProgrammationApiUser() {
  const user = await getAuthUserFromServer();
  if (!user) return null;
  return user;
}

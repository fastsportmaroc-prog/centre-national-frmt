import "server-only";

import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { requireModuleAccess } from "@/lib/auth/require-module-access";

/** Accès lecture API documents admin (rubrique Documents ou Passeports/Visas). */
export async function requireAdminDocumentsAccess(action: "view" | "edit" = "view") {
  const documents = await requireModuleAccess("documents", action);
  if (documents.ok) return getAuthUserFromServer();

  const passeports = await requireModuleAccess("passports_visas", action);
  if (passeports.ok) return getAuthUserFromServer();

  return null;
}

export async function requirePasseportsModuleAccess(action: "view" | "edit" = "view") {
  const access = await requireModuleAccess("passports_visas", action);
  if (!access.ok) return null;
  return getAuthUserFromServer();
}

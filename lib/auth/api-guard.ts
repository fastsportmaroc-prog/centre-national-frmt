import "server-only";

import { NextResponse } from "next/server";
import { requireModuleAccess } from "@/lib/auth/require-module-access";
import type { PermissionModuleKey } from "@/lib/types/user-permissions";

export async function guardModuleAccess(
  moduleKey: PermissionModuleKey,
  action: "view" | "edit" = "view"
): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const result = await requireModuleAccess(moduleKey, action);
  if (!result.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: result.error }, { status: result.status }),
    };
  }
  return { ok: true, userId: result.userId };
}

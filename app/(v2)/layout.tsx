import { authUserIsAppAdmin } from "@/lib/auth/admin-access";
import {
  loadPlayerCategoriesServer,
  loadUserPermissionsServer,
} from "@/lib/auth/check-permission.server";
import { getAuthUserFromServer } from "@/lib/auth/server-session";
import { V2AppLayoutClient } from "@/components/v2/V2AppLayoutClient";

export const dynamic = "force-dynamic";

export default async function V2RootLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getAuthUserFromServer();

  let initialPermissions: Awaited<ReturnType<typeof loadUserPermissionsServer>> = [];
  let initialPlayerCategories: string[] = [];
  if (initialUser) {
    const perms = await loadUserPermissionsServer(initialUser.id);
    const cats = await loadPlayerCategoriesServer(initialUser.id);
    const hasCustom = perms.length > 0;
    if (!authUserIsAppAdmin(initialUser, { hasCustomPermissions: hasCustom })) {
      initialPermissions = perms;
      initialPlayerCategories = cats;
    }
  }

  return (
    <V2AppLayoutClient
      initialUser={initialUser}
      initialPermissions={initialPermissions}
      initialPlayerCategories={initialPlayerCategories}
    >
      {children}
    </V2AppLayoutClient>
  );
}

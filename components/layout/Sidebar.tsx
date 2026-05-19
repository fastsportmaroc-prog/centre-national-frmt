"use client";

import { useMemo } from "react";
import { getNavSectionsForUser } from "./nav-items";
import { UserMenu } from "./UserMenu";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFrmtRole } from "@/components/auth/FrmtRoleProvider";
import { AppBrand } from "@/components/brand/AppBrand";
import { NavMenu } from "./NavMenu";

export function Sidebar() {
  const { user } = useAuth();
  const { frmtRole } = useFrmtRole();
  const sections = useMemo(
    () => getNavSectionsForUser(user?.role === "admin", frmtRole),
    [user?.role, frmtRole]
  );

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="frmt-tricolor shrink-0" />
      <div className="shrink-0 border-b border-border px-4 py-4">
        <AppBrand size="sm" showFederation={false} />
      </div>
      <nav className="sidebar-nav min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
        <NavMenu sections={sections} variant="sidebar" />
      </nav>
      <div className="shrink-0">
        <UserMenu />
      </div>
    </aside>
  );
}

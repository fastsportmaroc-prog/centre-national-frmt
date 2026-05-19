"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { getNavSectionsForUser } from "./nav-items";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFrmtRole } from "@/components/auth/FrmtRoleProvider";
import { Button } from "@/components/ui/Button";
import { AppBrand } from "@/components/brand/AppBrand";
import { NavMenu } from "./NavMenu";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MobileNav({ open, onClose }: Props) {
  const { user } = useAuth();
  const { frmtRole } = useFrmtRole();
  const sections = useMemo(
    () => getNavSectionsForUser(user?.role === "admin", frmtRole),
    [user?.role, frmtRole]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} role="presentation" />
      <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-surface">
        <div className="frmt-tricolor" />
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <AppBrand size="sm" showFederation={false} />
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="sidebar-nav min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3">
          <NavMenu sections={sections} variant="mobile" onNavigate={onClose} />
        </nav>
      </aside>
    </div>
  );
}

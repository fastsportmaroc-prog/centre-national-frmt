"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { LogOut, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function UserMenu() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <p className="px-4 py-2 text-xs text-muted">…</p>;
  }

  if (!user) return null;

  return (
    <div className="border-t border-border p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated">
          <User className="h-4 w-4 text-muted" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {user.fullName ?? user.email}
          </p>
          <Badge variant={user.role === "admin" ? "success" : "muted"}>
            {user.role === "admin" ? "Admin" : "Staff"}
          </Badge>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
        <LogOut className="h-4 w-4" />
        Déconnexion
      </Button>
    </div>
  );
}

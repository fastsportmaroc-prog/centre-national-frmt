"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, KeyRound, LogOut, User } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useRole } from "@/lib/hooks/useRole";
import { roleLabel } from "@/lib/types/app-roles";
import { cn } from "@/lib/utils/cn";

export function V2UserHeader() {
  const { logout } = useAuth();
  const { profile, role, loading } = useRole();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (loading) return <span className="text-xs text-muted">…</span>;

  const displayName =
    profile?.prenom || profile?.nom
      ? `${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim()
      : profile?.full_name ?? "Utilisateur";
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-sm hover:bg-surface-elevated"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a3c5e] text-xs font-semibold text-white">
          {initials || "?"}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block font-medium leading-tight">{displayName}</span>
          <span className="block text-[10px] text-muted">{roleLabel(role)}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              "absolute right-0 z-50 mt-1 min-w-[200px] rounded-lg border border-border bg-surface py-1 shadow-lg"
            )}
          >
            <p className="border-b border-border px-3 py-2 text-xs text-muted">
              Bonjour {profile?.prenom ?? displayName.split(" ")[0]}
            </p>
            <Link
              href="/v2/parametres"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-elevated"
              onClick={() => setOpen(false)}
            >
              <User className="h-4 w-4" />
              Mon profil
            </Link>
            <Link
              href="/auth/login?reset=1"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-elevated"
              onClick={() => setOpen(false)}
            >
              <KeyRound className="h-4 w-4" />
              Changer mot de passe
            </Link>
            <button
              type="button"
              disabled={loggingOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-surface-elevated disabled:opacity-60"
              onClick={() => {
                setOpen(false);
                setLoggingOut(true);
                void logout();
              }}
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Déconnexion…" : "Se déconnecter"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

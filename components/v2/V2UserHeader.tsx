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

  if (loading) return <span className="text-xs text-[var(--text-muted)]">…</span>;

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
        className="v2-user-pill"
      >
        <span className="v2-user-avatar">{initials || "?"}</span>
        <span className="hidden text-left sm:block">
          <span className="v2-user-name block">{displayName}</span>
          <span className="v2-user-role block">{roleLabel(role)}</span>
        </span>
        <ChevronDown className="hidden h-3.5 w-3.5 text-[var(--text-muted)] sm:block" />
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
              "absolute right-0 z-50 mt-1 min-w-[200px] rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] py-1"
            )}
          >
            <p className="border-b border-[var(--border-light)] px-3 py-2 text-xs text-[var(--text-muted)]">
              Bonjour {profile?.prenom ?? displayName.split(" ")[0]}
            </p>
            <Link
              href="/v2/parametres"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              onClick={() => setOpen(false)}
            >
              <User className="h-4 w-4" />
              Mon profil
            </Link>
            <Link
              href="/auth/login?reset=1"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              onClick={() => setOpen(false)}
            >
              <KeyRound className="h-4 w-4" />
              Changer mot de passe
            </Link>
            <button
              type="button"
              disabled={loggingOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-red-text)] hover:bg-[var(--bg-hover)] disabled:opacity-60"
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

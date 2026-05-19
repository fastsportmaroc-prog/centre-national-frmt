"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/performances/marocains", label: "Vue d'ensemble" },
  { href: "/performances/rankings", label: "Classements" },
  { href: "/performances/tournois", label: "Tournois" },
  { href: "/performances/resultats-recents", label: "Résultats récents" },
];

export function PerformancesNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
      {links.map(({ href, label }) => {
        const active =
          pathname === href ||
          (href === "/performances/marocains" && pathname === "/performances");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-frmt-green/15 text-frmt-green font-medium"
                : "text-muted hover:bg-surface-elevated"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

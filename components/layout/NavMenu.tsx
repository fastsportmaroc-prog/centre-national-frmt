"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { NavSection } from "./nav-items";

type Props = {
  sections: NavSection[];
  onNavigate?: () => void;
  variant?: "sidebar" | "mobile";
};

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(href);
}

export function NavMenu({ sections, onNavigate, variant = "sidebar" }: Props) {
  const pathname = usePathname();
  const mobile = variant === "mobile";

  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div
          key={section.id}
          className={cn(section.id === "systeme" && "border-t border-border/80 pt-4")}
        >
          {section.id === "systeme" && (
            <p className="v2-sidebar-section-label mx-1">{section.label}</p>
          )}
          <ul className="space-y-0.5">
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      mobile
                        ? active
                          ? "bg-frmt-green/10 text-frmt-green"
                          : "text-muted hover:bg-surface-elevated hover:text-foreground"
                        : active
                          ? "border-l-2 border-frmt-green bg-frmt-green/10 text-foreground"
                          : "text-muted hover:bg-surface-elevated hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active && "text-frmt-green"
                      )}
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

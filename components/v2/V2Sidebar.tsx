"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { UserMenu } from "@/components/layout/UserMenu";
import { NAV_BADGE_KEYS, v2NavSections } from "./nav-items";
import { loadNavBadges } from "@/lib/v2/nav-badges";

function badgeForHref(href: string, badges: Record<string, number>): number {
  if (href === NAV_BADGE_KEYS.hebergement) return badges["/v2/hebergement"] ?? 0;
  if (href === NAV_BADGE_KEYS.billets) return badges["/v2/billets-avion"] ?? 0;
  if (href === NAV_BADGE_KEYS.rapports) return badges["/v2/rapports"] ?? 0;
  return 0;
}

export function V2Sidebar() {
  const pathname = usePathname();
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    void loadNavBadges().then(setBadges);
  }, []);

  return (
    <aside className="v2-sidebar hidden h-screen w-[200px] shrink-0 flex-col border-r md:flex">
      <div className="frmt-tricolor shrink-0" />
      <nav className="sidebar-nav min-h-0 flex-1 overflow-y-auto p-2 pt-3">
        {v2NavSections.map((section) => (
          <div
            key={section.id}
            className={cn(section.separatorBefore && "mt-1 border-t border-[var(--border-light)] pt-1")}
          >
            {section.label && (
              <p className="v2-sidebar-section-label">{section.label}</p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                const badge = badgeForHref(item.href, badges);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "v2-sidebar-nav-link flex items-center gap-2 transition-colors",
                        active && "v2-sidebar-nav-link--active"
                      )}
                    >
                      <Icon className="shrink-0" strokeWidth={1.75} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 && (
                        <span className="rounded-full bg-[var(--accent-red-bg)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-red-text)]">
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-[var(--border-light)]">
        <UserMenu />
      </div>
    </aside>
  );
}

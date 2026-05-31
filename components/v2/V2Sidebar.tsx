"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AppBrand } from "@/components/brand/AppBrand";
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
    <aside className="v2-sidebar hidden h-screen w-64 shrink-0 flex-col border-r md:flex">
      <div className="frmt-tricolor shrink-0" />
      <div className="shrink-0 border-b border-white/5 px-4 py-4">
        <AppBrand size="sm" showFederation={false} />
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8899aa]">
          Centre National — V2
        </p>
      </div>
      <nav className="sidebar-nav min-h-0 flex-1 overflow-y-auto p-3">
        {v2NavSections.map((section) => (
          <div
            key={section.id}
            className={section.separatorBefore ? "mt-4 border-t border-white/5 pt-4" : ""}
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
                        "v2-sidebar-nav-link flex items-center gap-2 rounded-r-lg px-2 py-2 text-sm transition-colors",
                        active && "v2-sidebar-nav-link--active font-medium"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badge > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                            item.badgeKey === "hebergement" && "bg-red-500/20 text-red-400",
                            item.badgeKey === "billets" && "bg-orange-500/20 text-orange-300",
                            item.badgeKey === "rapports" && "bg-amber-500/20 text-amber-300"
                          )}
                        >
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
      <div className="shrink-0 border-t border-white/5">
        <UserMenu />
      </div>
    </aside>
  );
}

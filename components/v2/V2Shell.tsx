"use client";

import { createContext, useContext, useState } from "react";
import { V2Sidebar } from "./V2Sidebar";
import { LocalModeBadge } from "./LocalModeBadge";
import { ToastProvider } from "@/components/v2/ui/ToastProvider";
import { V2TopBar } from "@/components/v2/V2TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { v2NavSections } from "./nav-items";

const V2MobileContext = createContext<() => void>(() => {});

export function useV2OpenMobileMenu() {
  return useContext(V2MobileContext);
}

/** Sections plates pour menu mobile (compat NavMenu) */
const mobileSections = v2NavSections.map((s, idx) => ({
  id: (idx === 0 ? "general" : "systeme") as "general" | "systeme",
  label: s.label ?? "Navigation",
  description: undefined,
  items: s.items.map((i) => ({ href: i.href, label: i.label, icon: i.icon })),
}));

export function V2Shell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ToastProvider>
      <V2MobileContext.Provider value={() => setMobileOpen(true)}>
        <div className="flex min-h-screen bg-[var(--bg-base)]">
          <V2Sidebar />
          <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} sectionsOverride={mobileSections} />
          <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg-base)]">
            <V2TopBar />
            {children}
          </div>
          <LocalModeBadge />
        </div>
      </V2MobileContext.Provider>
    </ToastProvider>
  );
}

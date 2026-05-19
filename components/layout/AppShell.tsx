"use client";

import { createContext, useContext, useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

const MobileMenuContext = createContext<() => void>(() => {});

export function useOpenMobileMenu() {
  return useContext(MobileMenuContext);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <MobileMenuContext.Provider value={() => setMobileOpen(true)}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </MobileMenuContext.Provider>
  );
}

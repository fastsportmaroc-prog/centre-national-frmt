"use client";

import { NotificationBell } from "@/components/ui/NotificationBell";
import { DisplayDateBlock } from "@/components/v2/ui/DisplayDateBlock";
import { GlobalSearchBar } from "@/components/v2/GlobalSearchBar";
import { V2UserHeader } from "@/components/v2/V2UserHeader";

export function V2TopBar() {
  const actions = (
    <div className="flex shrink-0 items-center justify-end gap-2">
      <NotificationBell />
      <V2UserHeader />
    </div>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-main)]/98 backdrop-blur-md">
      {/* Desktop : recherche large | date | actions */}
      <div className="hidden items-center gap-4 px-4 py-2.5 lg:grid lg:grid-cols-[minmax(300px,1.4fr)_minmax(300px,1.6fr)_auto]">
        <div className="w-full max-w-2xl justify-self-start">
          <GlobalSearchBar />
        </div>
        <DisplayDateBlock variant="topbar" className="w-full justify-self-center" />
        <div className="justify-self-end pl-2">{actions}</div>
      </div>

      {/* Mobile / tablette */}
      <div className="flex flex-col gap-2 px-3 py-2 lg:hidden">
        <div className="flex items-center gap-2">
          <GlobalSearchBar className="flex-1" />
          {actions}
        </div>
        <DisplayDateBlock variant="topbar" className="w-full" />
      </div>
    </header>
  );
}

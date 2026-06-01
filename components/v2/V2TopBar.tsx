"use client";

import { NotificationBell } from "@/components/ui/NotificationBell";
import { LogoPlaceholder } from "@/components/brand/LogoPlaceholder";
import { DisplayDateBlock } from "@/components/v2/ui/DisplayDateBlock";
import { GlobalSearchBar } from "@/components/v2/GlobalSearchBar";
import { V2UserHeader } from "@/components/v2/V2UserHeader";

function TopBarBrand() {
  return (
    <div className="v2-topbar-logo">
      <div className="v2-topbar-logo-img">
        <LogoPlaceholder size="xs" className="h-full w-full" />
      </div>
      <div className="min-w-0">
        <p className="v2-topbar-brand-title truncate">Centre National</p>
        <p className="v2-topbar-brand-sub truncate">CNE — V2</p>
      </div>
    </div>
  );
}

export function V2TopBar() {
  const actions = (
    <div className="flex shrink-0 items-center justify-end gap-2">
      <NotificationBell compact />
      <V2UserHeader />
    </div>
  );

  return (
    <header className="v2-topbar sticky top-0 z-30">
      <div className="hidden h-[52px] items-center gap-4 px-4 lg:grid lg:grid-cols-[minmax(160px,auto)_minmax(240px,1fr)_minmax(200px,auto)_auto]">
        <TopBarBrand />
        <div className="v2-topbar-search w-full max-w-xl justify-self-start">
          <GlobalSearchBar />
        </div>
        <DisplayDateBlock variant="topbar" className="justify-self-center" />
        <div className="justify-self-end">{actions}</div>
      </div>

      <div className="flex flex-col gap-2 px-3 py-2 lg:hidden">
        <div className="flex items-center gap-2">
          <TopBarBrand />
          <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
        </div>
        <GlobalSearchBar className="v2-topbar-search w-full" />
        <DisplayDateBlock variant="topbar" className="w-full" />
      </div>
    </header>
  );
}

"use client";

import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardStagesSection } from "@/components/dashboard/DashboardStagesSection";
import { OccupationWidget } from "@/components/dashboard/OccupationWidget";
import { PageHeader } from "@/components/layout/PageHeader";
import { LocalTestBadge } from "@/components/ui/LocalTestBadge";
import { versionLabel } from "@/lib/version";
import { isLocalTestModeClient } from "@/lib/local-test/mode";

export function DashboardClient() {
  const localMode = isLocalTestModeClient();

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description={`Centre National FRMT — vue d'ensemble · ${versionLabel()}`}
        actions={localMode ? <LocalTestBadge /> : undefined}
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <DashboardHero />
        <DashboardStagesSection />
        <OccupationWidget />
      </main>
    </>
  );
}

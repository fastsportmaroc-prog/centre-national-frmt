import { Suspense } from "react";
import { CalendrierV2Client } from "@/components/v2/calendrier/CalendrierV2Client";

function CalendrierFallback() {
  return (
    <div className="p-6 text-sm text-[var(--text-secondary)]">Chargement du calendrier…</div>
  );
}

export default function V2CalendrierPage() {
  return (
    <Suspense fallback={<CalendrierFallback />}>
      <CalendrierV2Client />
    </Suspense>
  );
}

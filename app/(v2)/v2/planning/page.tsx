import { Suspense } from "react";
import { PlanningV2Client } from "@/components/v2/planning/PlanningV2Client";

function PlanningFallback() {
  return (
    <div className="p-6 text-sm text-[var(--text-secondary)]">Chargement du planning…</div>
  );
}

export default function V2PlanningPage() {
  return (
    <Suspense fallback={<PlanningFallback />}>
      <PlanningV2Client />
    </Suspense>
  );
}

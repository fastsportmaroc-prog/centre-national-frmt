import { Suspense } from "react";
import { PerformancesRankingsClient } from "@/components/performances/PerformancesRankingsClient";

export default function PerformancesRankingsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <PerformancesRankingsClient />
    </Suspense>
  );
}

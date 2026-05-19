import { Suspense } from "react";
import { PerformancesResultatsClient } from "@/components/performances/PerformancesResultatsClient";

export default function PerformancesResultatsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <PerformancesResultatsClient />
    </Suspense>
  );
}

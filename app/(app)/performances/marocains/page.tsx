import { Suspense } from "react";
import { PerformancesMarocainsClient } from "@/components/performances/PerformancesMarocainsClient";

export default function PerformancesMarocainsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <PerformancesMarocainsClient />
    </Suspense>
  );
}

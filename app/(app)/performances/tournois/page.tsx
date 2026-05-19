import { Suspense } from "react";
import { PerformancesTournoisClient } from "@/components/performances/PerformancesTournoisClient";

export default function PerformancesTournoisPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <PerformancesTournoisClient />
    </Suspense>
  );
}

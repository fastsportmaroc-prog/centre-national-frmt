import { Suspense } from "react";
import { PerformancesJoueurClient } from "@/components/performances/PerformancesJoueurClient";

export default function PerformancesJoueurPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <PerformancesJoueurClient />
    </Suspense>
  );
}

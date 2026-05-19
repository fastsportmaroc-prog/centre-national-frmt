import { Suspense } from "react";
import { RapportsClient } from "@/components/rapports/RapportsClient";

export default function RapportsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement rapports…</p>}>
      <RapportsClient />
    </Suspense>
  );
}

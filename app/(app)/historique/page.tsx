import { Suspense } from "react";
import { HistoriqueClient } from "@/components/historique/HistoriqueClient";

export default function HistoriquePage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement historique…</p>}>
      <HistoriqueClient />
    </Suspense>
  );
}

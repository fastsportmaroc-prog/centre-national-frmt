import { Suspense } from "react";
import { LogistiqueClient } from "@/components/logistique/LogistiqueClient";

export default function LogistiquePage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement logistique…</p>}>
      <LogistiqueClient />
    </Suspense>
  );
}

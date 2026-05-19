import { Suspense } from "react";
import { HebergementClient } from "@/components/hebergement/HebergementClient";

export default function HebergementPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement hébergement…</p>}>
      <HebergementClient />
    </Suspense>
  );
}

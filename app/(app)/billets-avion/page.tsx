import { Suspense } from "react";
import { BilletsAvionClient } from "@/components/billets/BilletsAvionClient";

export default function BilletsAvionPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement billets…</p>}>
      <BilletsAvionClient />
    </Suspense>
  );
}

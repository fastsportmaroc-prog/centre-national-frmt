import { Suspense } from "react";
import { BilletsAvionV2Client } from "@/components/v2/billets-avion/BilletsAvionV2Client";

function BilletsFallback() {
  return (
    <div className="p-6 text-sm text-[var(--text-secondary)]">Chargement des billets avion…</div>
  );
}

export default function V2BilletsAvionPage() {
  return (
    <Suspense fallback={<BilletsFallback />}>
      <BilletsAvionV2Client />
    </Suspense>
  );
}
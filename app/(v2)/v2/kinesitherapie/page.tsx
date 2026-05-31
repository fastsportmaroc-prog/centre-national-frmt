import { Suspense } from "react";
import { KinesitherapieV2Client } from "@/components/v2/kinesitherapie/KinesitherapieV2Client";

export default function KinesitherapieV2Page() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement kinésithérapie…</p>}>
      <KinesitherapieV2Client />
    </Suspense>
  );
}

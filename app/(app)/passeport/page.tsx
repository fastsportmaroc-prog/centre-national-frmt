import { Suspense } from "react";
import { PasseportClient } from "@/components/passeport/PasseportClient";

export default function PasseportPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement passeport…</p>}>
      <PasseportClient />
    </Suspense>
  );
}

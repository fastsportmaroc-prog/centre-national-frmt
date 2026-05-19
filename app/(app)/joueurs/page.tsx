import { Suspense } from "react";
import { JoueursClient } from "@/components/joueurs/JoueursClient";

export default function JoueursPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement des joueurs…</p>}>
      <JoueursClient />
    </Suspense>
  );
}

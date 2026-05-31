import { Suspense } from "react";
import { CompetitionDetailClient } from "@/components/v2/competitions/CompetitionDetailClient";

export const dynamic = "force-dynamic";

function CompetitionDetailFallback() {
  return <p className="p-6 text-sm text-muted">Chargement de la compétition…</p>;
}

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<CompetitionDetailFallback />}>
      <CompetitionDetailClient id={decodeURIComponent(id)} />
    </Suspense>
  );
}

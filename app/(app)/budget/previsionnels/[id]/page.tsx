import { Suspense } from "react";
import { BudgetPrevisionnelDetailClient } from "@/components/budget/BudgetPrevisionnelDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function BudgetPrevisionnelDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement…</p>}>
      <BudgetPrevisionnelDetailClient id={id} />
    </Suspense>
  );
}

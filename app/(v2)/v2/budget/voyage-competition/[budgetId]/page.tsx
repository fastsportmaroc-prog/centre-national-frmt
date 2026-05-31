import { Suspense } from "react";
import { BudgetCompetitionPrevisionnelV2Client } from "@/components/v2/budget/BudgetCompetitionPrevisionnelV2Client";

export default async function V2BudgetCompetitionEditPage({
  params,
}: {
  params: Promise<{ budgetId: string }>;
}) {
  const { budgetId } = await params;
  return (
    <Suspense fallback={<p className="p-4 text-muted">Chargement…</p>}>
      <BudgetCompetitionPrevisionnelV2Client budgetId={decodeURIComponent(budgetId)} />
    </Suspense>
  );
}

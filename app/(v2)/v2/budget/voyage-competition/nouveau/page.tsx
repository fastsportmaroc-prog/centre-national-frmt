import { Suspense } from "react";
import { BudgetCompetitionPrevisionnelV2Client } from "@/components/v2/budget/BudgetCompetitionPrevisionnelV2Client";

export default function V2BudgetCompetitionNouveauPage() {
  return (
    <Suspense fallback={<p className="p-4 text-muted">Chargement du formulaire…</p>}>
      <BudgetCompetitionPrevisionnelV2Client />
    </Suspense>
  );
}

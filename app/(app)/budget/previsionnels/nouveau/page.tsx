import { Suspense } from "react";
import { BudgetPrevisionnelCreateClient } from "@/components/budget/BudgetPrevisionnelCreateClient";

export default function BudgetPrevisionnelNouveauPage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Chargement du formulaire…</p>}>
      <BudgetPrevisionnelCreateClient />
    </Suspense>
  );
}

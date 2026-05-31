import { redirect } from "next/navigation";

/** Ancienne entrée — regroupée sous coût stages CNE (MAD). */
export default function V2BudgetPrevisionnelStagesRedirect() {
  redirect("/v2/budget/stages-cne");
}

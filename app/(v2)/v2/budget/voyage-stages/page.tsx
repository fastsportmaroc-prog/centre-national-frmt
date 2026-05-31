import { redirect } from "next/navigation";

/** Ancien budget voyage EUR — remplacé par estimation MAD depuis fiche stage. */
export default function V2BudgetVoyageStagesRedirect() {
  redirect("/v2/budget/stages-cne");
}

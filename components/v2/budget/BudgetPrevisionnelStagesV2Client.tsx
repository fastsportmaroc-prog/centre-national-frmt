"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileDown, Plus } from "lucide-react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listBudgetsPrevisionnel, markBudgetPdfExported } from "@/lib/data/budget-previsionnel";
import { getStages } from "@/lib/supabase/queries";
import { openBudgetPrevisionnelPdf } from "@/lib/reports/budget-previsionnel-report";
import type { BudgetPrevisionnel } from "@/lib/types/budget-previsionnel";
import type { StageProgrammeV2 } from "@/lib/types/v2";
import { formatEur, formatMad } from "@/lib/utils/budget-previsionnel-math";
import { formatDate } from "@/lib/utils/dates";

export function BudgetPrevisionnelStagesV2Client() {
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [budgets, setBudgets] = useState<BudgetPrevisionnel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, bs] = await Promise.all([
      getStages(),
      listBudgetsPrevisionnel({ type_budget: "stage" }),
    ]);
    setStages(s);
    setBudgets(bs);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byStageId = useMemo(() => {
    const m = new Map<string, BudgetPrevisionnel[]>();
    for (const b of budgets) {
      if (!b.stage_id) continue;
      const arr = m.get(b.stage_id) ?? [];
      arr.push(b);
      m.set(b.stage_id, arr);
    }
    return m;
  }, [budgets]);

  const totals = useMemo(
    () => ({
      eur: budgets.reduce((s, b) => s + (b.total_eur || 0), 0),
      mad: budgets.reduce((s, b) => s + (b.total_mad || 0), 0),
    }),
    [budgets]
  );

  async function exportPdf(b: BudgetPrevisionnel) {
    openBudgetPrevisionnelPdf(b);
    await markBudgetPdfExported(b.id, "v2-admin");
  }

  return (
    <>
      <V2PageHeader
        title="Budget prévisionnel — Stages"
        description="Estimations de coût par stage (module officiel EUR/MAD, export PDF)"
        actions={
          <Link href="/budget/previsionnels/nouveau?type=stage">
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Nouveau budget stage
            </Button>
          </Link>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Link href="/v2/budget" className="text-sm text-[var(--frmt-gold)] hover:underline">
          ← Budget administratif
        </Link>
        <Card className="p-4 text-sm text-muted">
          <p>
            <strong className="text-[var(--fg)]">Devise :</strong> saisie en euros ou en dirhams dans
            chaque budget, avec conversion automatique selon le taux EUR/MAD.
          </p>
        </Card>

        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-muted">
                <th className="p-3">Stage</th>
                <th className="p-3">Période</th>
                <th className="p-3">Budget(s)</th>
                <th className="p-3 text-right">Total EUR</th>
                <th className="p-3 text-right">Total MAD</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-muted">
                    Chargement…
                  </td>
                </tr>
              ) : stages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-muted">
                    Aucun stage.
                  </td>
                </tr>
              ) : (
                stages.map((st) => {
                  const linked = byStageId.get(st.id) ?? [];
                  const sumEur = linked.reduce((s, b) => s + b.total_eur, 0);
                  const sumMad = linked.reduce((s, b) => s + b.total_mad, 0);
                  return (
                    <tr key={st.id} className="border-b border-[var(--border)]/40">
                      <td className="p-3 font-medium">{st.stage_action}</td>
                      <td className="p-3 text-muted">
                        {formatDate(st.date_debut)} → {formatDate(st.date_fin)}
                      </td>
                      <td className="p-3">
                        {linked.length === 0 ? (
                          <Badge variant="muted">Aucun</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {linked.map((b) => (
                              <Badge key={b.id} variant="success">
                                {b.objet.slice(0, 28)}
                                {b.objet.length > 28 ? "…" : ""}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">{linked.length ? formatEur(sumEur) : "—"}</td>
                      <td className="p-3 text-right">{linked.length ? formatMad(sumMad) : "—"}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Link
                            href={`/budget/previsionnels/nouveau?type=stage&stage_id=${st.id}`}
                            className="inline-flex h-8 items-center rounded-md border border-[var(--border)] px-2 text-xs hover:bg-[var(--bg-elevated)]"
                          >
                            + Budget
                          </Link>
                          {linked[0] && (
                            <>
                              <Link
                                href={`/budget/previsionnels/${linked[0].id}`}
                                className="inline-flex h-8 items-center rounded-md border border-[var(--border)] px-2 text-xs hover:bg-[var(--bg-elevated)]"
                              >
                                Ouvrir
                              </Link>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-8 gap-1 px-2 text-xs"
                                onClick={() => void exportPdf(linked[0]!)}
                              >
                                <FileDown className="h-3 w-3" /> PDF
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {!loading && budgets.length > 0 && (
              <tfoot>
                <tr className="bg-[#1a3c5e] font-semibold text-white">
                  <td colSpan={3} className="p-3">
                    Synthèse budgets stages ({budgets.length})
                  </td>
                  <td className="p-3 text-right">{formatEur(totals.eur)}</td>
                  <td className="p-3 text-right">{formatMad(totals.mad)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Link href="/budget/previsionnels">
            <Button variant="secondary" size="sm">
              Tous les budgets prévisionnels
            </Button>
          </Link>
        </div>
      </main>
    </>
  );
}

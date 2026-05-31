"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ExportPdfButton } from "@/components/v2/ui/ExportPdfButton";
import {
  getHebergements,
  getRestaurations,
  getStages,
} from "@/lib/supabase/queries";
import {
  computeStageBudgetEstimateMad,
  formatMad,
} from "@/lib/v2/stage-budget-estimate";
import { useTarifsBudget } from "@/lib/v2/use-tarifs-budget";
import type { StageProgrammeV2 } from "@/lib/types/v2";
import { formatDate } from "@/lib/utils/dates";
import { exportStagesCneBudgetPdf } from "@/lib/pdf/pdf-exports";

type Row = {
  stage: StageProgrammeV2;
  estimate: ReturnType<typeof computeStageBudgetEstimateMad>;
};

export function BudgetStagesCneV2Client() {
  const tarifs = useTarifsBudget();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [annee, setAnnee] = useState(new Date().getFullYear());

  const load = useCallback(async () => {
    setLoading(true);
    const [stages, hebergements, restaurations] = await Promise.all([
      getStages(),
      getHebergements(),
      getRestaurations(),
    ]);
    const hebByStage = new Map(hebergements.map((h) => [h.stage_id, h]));
    const restByStage = new Map(restaurations.map((r) => [r.stage_id, r]));

    const computed: Row[] = stages.map((stage) => ({
      stage,
      estimate: computeStageBudgetEstimateMad({
        dateDebut: stage.date_debut,
        dateFin: stage.date_fin,
        terrainsActif: Boolean(stage.terrains),
        hebergement: hebByStage.get(stage.id) ?? null,
        restauration: restByStage.get(stage.id) ?? null,
        tarifs,
      }),
    }));
    setRows(computed);
    setLoading(false);
  }, [tarifs]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => rows.filter((r) => r.stage.date_debut.startsWith(String(annee))),
    [rows, annee]
  );

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => ({
          hebergement: acc.hebergement + r.estimate.hebergement,
          restauration: acc.restauration + r.estimate.restauration,
          terrains: acc.terrains + r.estimate.terrains,
          total: acc.total + r.estimate.total,
        }),
        { hebergement: 0, restauration: 0, terrains: 0, total: 0 }
      ),
    [filtered]
  );

  function exportPdf() {
    exportStagesCneBudgetPdf(
      annee,
      filtered.map((r) => ({
        stage: r.stage.stage_action,
        categorie: r.stage.categorie,
        periode: `${formatDate(r.stage.date_debut)} → ${formatDate(r.stage.date_fin)}`,
        hebergement: formatMad(r.estimate.hebergement),
        restauration: formatMad(r.estimate.restauration),
        terrains: formatMad(r.estimate.terrains),
        total: formatMad(r.estimate.total),
      })),
      totals
    );
  }

  return (
    <>
      <V2PageHeader
        title="Coût des stages — FRMT"
        description="Estimation en dirhams (MAD) — même calcul que l’onglet Budget de chaque stage, tarifs Paramètres"
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Link href="/v2/budget" className="text-sm text-[var(--frmt-gold)] hover:underline">
          ← Budget administratif
        </Link>

        <Card className="p-4 text-sm text-muted">
          <p>
            Les montants sont calculés automatiquement à partir de l&apos;
            <strong className="text-[var(--fg)]">hébergement</strong>, de la{" "}
            <strong className="text-[var(--fg)]">restauration</strong> et des{" "}
            <strong className="text-[var(--fg)]">terrains</strong> renseignés sur chaque stage, avec
            les tarifs MAD de{" "}
            <Link href="/v2/parametres" className="text-[var(--frmt-gold)] underline">
              Paramètres
            </Link>
            .
          </p>
          <p className="mt-2 font-medium text-emerald-400">Affichage uniquement en MAD (pas d&apos;EUR).</p>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            Année
            <input
              type="number"
              className="w-24 rounded-md border border-[var(--border)] bg-transparent px-2 py-1"
              value={annee}
              onChange={(e) => setAnnee(Number(e.target.value) || annee)}
            />
          </label>
          <ExportPdfButton onExport={exportPdf} label="Exporter synthèse MAD" disabled={filtered.length === 0} />
          <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
            Actualiser
          </Button>
        </div>

        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-muted">
                <th className="p-3">Stage créé</th>
                <th className="p-3">Période</th>
                <th className="p-3 text-right">Hébergement</th>
                <th className="p-3 text-right">Restauration</th>
                <th className="p-3 text-right">Terrains</th>
                <th className="p-3 text-right">Total MAD</th>
                <th className="p-3 text-right">Fiche</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-4 text-muted">
                    Chargement…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-muted">
                    Aucun stage pour {annee}.{" "}
                    <Link href="/v2/stages" className="text-[var(--frmt-gold)] underline">
                      Voir les stages
                    </Link>
                  </td>
                </tr>
              ) : (
                filtered.map(({ stage, estimate }) => (
                  <tr key={stage.id} className="border-b border-[var(--border)]/40">
                    <td className="p-3 font-medium">{stage.stage_action}</td>
                    <td className="p-3 text-muted">
                      {formatDate(stage.date_debut)} → {formatDate(stage.date_fin)}
                    </td>
                    <td className="p-3 text-right">{formatMad(estimate.hebergement)}</td>
                    <td className="p-3 text-right">{formatMad(estimate.restauration)}</td>
                    <td className="p-3 text-right">{formatMad(estimate.terrains)}</td>
                    <td className="p-3 text-right font-semibold text-[var(--frmt-gold)]">
                      {formatMad(estimate.total)}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/v2/stages/${stage.id}?tab=budget`}
                        className="inline-flex items-center gap-1 text-xs text-[var(--frmt-gold)] hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Budget stage
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr className="bg-[#1a3c5e] font-semibold text-white">
                  <td colSpan={2} className="p-3">
                    Total {annee} ({filtered.length} stage{filtered.length > 1 ? "s" : ""})
                  </td>
                  <td className="p-3 text-right">{formatMad(totals.hebergement)}</td>
                  <td className="p-3 text-right">{formatMad(totals.restauration)}</td>
                  <td className="p-3 text-right">{formatMad(totals.terrains)}</td>
                  <td className="p-3 text-right">{formatMad(totals.total)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </Card>
      </main>
    </>
  );
}

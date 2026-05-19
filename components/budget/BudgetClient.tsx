"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { BUDGET_ANNEE_DEFAUT, CATEGORIES_BUDGET } from "@/lib/constants/budget";
import { getBudgetDashboard, updateBudgetAnnuelLigne } from "@/lib/data/budget";
import { exportPdfReport, openPrintReport } from "@/lib/export/reports";
import {
  buildBudgetAnnuelReport,
  buildBudgetJoueursReport,
  budgetToCsv,
} from "@/lib/reports/budget-export";
import type { BudgetDashboard } from "@/lib/types/budget";
import { FileDown, Printer } from "lucide-react";

type Tab = "annuel" | "joueurs" | "stages";

function pctBar(alloue: number, reel: number): number {
  if (alloue <= 0) return 0;
  return Math.min(100, Math.round((reel / alloue) * 100));
}

function barColor(pct: number): string {
  if (pct > 95) return "bg-red-500";
  if (pct > 75) return "bg-amber-500";
  return "bg-emerald-500";
}

export function BudgetClient() {
  const [annee, setAnnee] = useState(BUDGET_ANNEE_DEFAUT);
  const [tab, setTab] = useState<Tab>("annuel");
  const [dashboard, setDashboard] = useState<BudgetDashboard | null>(null);

  const load = useCallback(async () => {
    setDashboard(await getBudgetDashboard(annee));
  }, [annee]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveAlloue(id: string, value: number) {
    await updateBudgetAnnuelLigne(id, { montant_alloue: value });
    await load();
  }

  function downloadCsv() {
    if (!dashboard) return;
    const blob = new Blob([budgetToCsv(dashboard)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `budget-frmt-${annee}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!dashboard) {
    return <p className="p-8 text-muted">Chargement du budget…</p>;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "annuel", label: "Budget annuel" },
    { id: "joueurs", label: "Par joueur" },
    { id: "stages", label: "Par stage" },
  ];

  return (
    <FadeIn>
      <PageHeader
        title="Budget FRMT"
        description="Suivi annuel, par joueur et par stage — comparaison alloué / réel"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => openPrintReport(buildBudgetAnnuelReport(dashboard))}>
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button
              variant="secondary"
              onClick={() => exportPdfReport(buildBudgetAnnuelReport(dashboard), `budget-${annee}.pdf`)}
            >
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="secondary" onClick={downloadCsv}>
              Export CSV
            </Button>
            <Link href="/budget/deplacements">
              <Button variant="secondary">Budget déplacement</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <Label>Année</Label>
          <Input
            type="number"
            className="w-28"
            value={annee}
            onChange={(ev) => setAnnee(Number(ev.target.value))}
          />
        </div>
        <Card className="premium flex-1 min-w-[200px] p-4">
          <p className="text-xs text-muted">Total alloué / réel</p>
          <p className="text-xl font-semibold">
            {dashboard.total_reel.toLocaleString("fr-FR")} /{" "}
            {dashboard.total_alloue.toLocaleString("fr-FR")} MAD
          </p>
        </Card>
        <Card className="premium min-w-[160px] p-4">
          <p className="text-xs text-muted">Engagé</p>
          <p className="text-xl font-semibold">
            {dashboard.total_engage.toLocaleString("fr-FR")} MAD
          </p>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === t.id ? "bg-tennis/20 text-tennis" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "annuel" && (
        <div className="space-y-4">
          {dashboard.lignes_annuelles
            .filter((l) => l.categorie !== "total")
            .map((l) => {
              const pct = pctBar(l.montant_alloue, l.montant_reel);
              const label =
                CATEGORIES_BUDGET.find((c) => c.value === l.categorie)?.label ?? l.categorie;
              return (
                <Card key={l.id} className="premium p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-xs text-muted">{l.libelle}</p>
                    </div>
                    <p className="text-sm">
                      <span className="text-muted">Réel </span>
                      {l.montant_reel.toLocaleString("fr-FR")} /{" "}
                      {l.montant_alloue.toLocaleString("fr-FR")} MAD
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all ${barColor(pct)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <span>Alloué modifiable :</span>
                    <Input
                      type="number"
                      className="h-8 w-32"
                      defaultValue={l.montant_alloue}
                      onBlur={(ev) => {
                        const v = Number(ev.target.value);
                        if (!Number.isNaN(v) && v !== l.montant_alloue) {
                          saveAlloue(l.id, v);
                        }
                      }}
                    />
                    <span>MAD · Engagé {l.montant_engage.toLocaleString("fr-FR")}</span>
                  </div>
                </Card>
              );
            })}
        </div>
      )}

      {tab === "joueurs" && (
        <Card className="premium overflow-hidden">
          <div className="flex justify-end border-b border-border p-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => exportPdfReport(buildBudgetJoueursReport(dashboard), `budget-joueurs-${annee}.pdf`)}
            >
              PDF joueurs
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3">Joueur</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3 text-right">Alloué</th>
                <th className="p-3 text-right">Dépenses</th>
                <th className="p-3">Utilisation</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.par_joueur.map((j) => (
                <tr key={j.joueur_id} className="border-b border-border/50">
                  <td className="p-3 font-medium">{j.joueur_nom}</td>
                  <td className="p-3 text-muted">{j.categorie_age}</td>
                  <td className="p-3 text-right">{j.budget_alloue.toLocaleString("fr-FR")}</td>
                  <td className="p-3 text-right">{j.depenses_reelles.toLocaleString("fr-FR")}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={`h-full ${barColor(j.taux_utilisation_pct)}`}
                          style={{ width: `${Math.min(100, j.taux_utilisation_pct)}%` }}
                        />
                      </div>
                      <span className="w-10 text-xs">{j.taux_utilisation_pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "stages" && (
        <Card className="premium overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3">Stage</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Prévu</th>
                <th className="p-3 text-right">Réel</th>
                <th className="p-3 text-right">Écart</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.par_stage.map((s) => (
                <tr key={s.stage_id} className="border-b border-border/50">
                  <td className="p-3 font-medium">{s.stage_libelle}</td>
                  <td className="p-3 text-muted">{s.categorie}</td>
                  <td className="p-3 text-muted">{s.date_debut}</td>
                  <td className="p-3 text-right">{s.budget_prevu.toLocaleString("fr-FR")}</td>
                  <td className="p-3 text-right">{s.budget_reel.toLocaleString("fr-FR")}</td>
                  <td
                    className={`p-3 text-right font-medium ${
                      s.ecart < 0 ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {s.ecart.toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </FadeIn>
  );
}

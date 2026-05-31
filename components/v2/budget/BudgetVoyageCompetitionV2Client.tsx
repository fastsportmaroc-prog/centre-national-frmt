"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { ExternalLink, FileDown, Plus } from "lucide-react";

import { V2PageHeader } from "@/components/v2/V2PageHeader";

import { Button } from "@/components/ui/Button";

import { Card } from "@/components/ui/Card";

import { Badge } from "@/components/ui/Badge";

import { listBudgetsPrevisionnel, markBudgetPdfExported } from "@/lib/data/budget-previsionnel";

import { openBudgetPrevisionnelPdf } from "@/lib/reports/budget-previsionnel-report";

import type { BudgetPrevisionnel } from "@/lib/types/budget-previsionnel";

import {

  competitionRefFromBudget,

  competitionRefLabel,

} from "@/components/v2/budget/BudgetCompetitionPrevisionnelV2Client";

import type { Competition } from "@/lib/types/competition";

import { formatEur, formatMad } from "@/lib/utils/budget-previsionnel-math";

import { formatDate } from "@/lib/utils/dates";



function budgetMatchesCompetition(b: BudgetPrevisionnel, comp: Competition): boolean {

  const key = comp.nom.trim().toLowerCase();

  const ref = competitionRefLabel(comp.id);

  if (b.equipe_libelle === ref) return true;

  const refId = competitionRefFromBudget(b.equipe_libelle);

  if (refId === comp.id) return true;

  const ev = (b.tournoi_evenement ?? "").trim().toLowerCase();

  const obj = b.objet.trim().toLowerCase();

  return ev === key || obj.includes(key) || key.includes(ev);

}



function budgetLabel(b: BudgetPrevisionnel): string {

  return (b.tournoi_evenement ?? b.objet).trim() || "Sans titre";

}



function budgetLieu(b: BudgetPrevisionnel): string {

  const parts = [b.ville, b.pays].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "—";

}



function BudgetAmountCell({ b }: { b: BudgetPrevisionnel }) {

  return (

    <div className="text-xs">

      <p>

        {b.devise === "MAD" ? formatMad(b.total_mad) : formatEur(b.total_eur)}

        {b.devise === "EUR" && (

          <span className="text-muted"> → {formatMad(b.total_mad)}</span>

        )}

      </p>

      <p className="text-muted">{b.statut}</p>

    </div>

  );

}



export function BudgetVoyageCompetitionV2Client() {

  const [competitions, setCompetitions] = useState<Competition[]>([]);

  const [budgets, setBudgets] = useState<BudgetPrevisionnel[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);



  const load = useCallback(async () => {

    setLoading(true);

    setError(null);

    try {

      const compRes = await fetch("/api/competitions", { credentials: "include" });

      if (!compRes.ok) {

        setError("Impossible de charger les compétitions.");

        setCompetitions([]);

      } else {

        const compJson = (await compRes.json()) as { competitions?: Competition[] };

        setCompetitions(compJson.competitions ?? []);

      }

      const [tournoi, mission] = await Promise.all([

        listBudgetsPrevisionnel({ type_budget: "tournoi" }),

        listBudgetsPrevisionnel({ type_budget: "mission" }),

      ]);

      setBudgets([...tournoi, ...mission]);

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    void load();

  }, [load]);



  function budgetsForCompetition(comp: Competition): BudgetPrevisionnel[] {

    return budgets.filter((b) => budgetMatchesCompetition(b, comp));

  }



  const linkedBudgetIds = useMemo(() => {

    const ids = new Set<string>();

    for (const c of competitions) {

      for (const b of budgetsForCompetition(c)) {

        ids.add(b.id);

      }

    }

    return ids;

  }, [competitions, budgets]);



  const standaloneBudgets = useMemo(

    () => budgets.filter((b) => !linkedBudgetIds.has(b.id)),

    [budgets, linkedBudgetIds]

  );



  async function exportPdf(b: BudgetPrevisionnel) {

    openBudgetPrevisionnelPdf(b);

    await markBudgetPdfExported(b.id);

  }



  const withBudget = useMemo(

    () => competitions.filter((c) => budgetsForCompetition(c).length > 0),

    [competitions, budgets]

  );



  const isEmpty = !loading && standaloneBudgets.length === 0 && competitions.length === 0;



  return (

    <>

      <V2PageHeader

        title="Budget voyage — Compétitions"

        description="Prévisionnels voyage (EUR ou MAD) — avec ou sans fiche compétition, export PDF"

        actions={

          <Link href="/v2/budget/voyage-competition/nouveau">

            <Button size="sm" className="gap-1">

              <Plus className="h-4 w-4" /> Nouveau prévisionnel

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

            <strong className="text-[var(--fg)]">Option A —</strong> Créez un prévisionnel directement

            via <strong className="text-[var(--fg)]">Nouveau prévisionnel</strong> (tournoi, dates,

            lieu saisis à la main).

          </p>

          <p className="mt-2">

            <strong className="text-[var(--fg)]">Option B —</strong> Liez un budget à une compétition

            existante (

            <Link href="/competitions" className="text-[var(--frmt-gold)] underline">

              Compétitions

            </Link>

            ) via <strong>Créer budget</strong> sur la ligne correspondante.

          </p>

          <p className="mt-2">

            <strong className="text-[var(--fg)]">Devise :</strong> EUR (converti en MAD au taux saisi)

            ou MAD direct. Export PDF depuis la liste ou le formulaire.

          </p>

        </Card>



        {error && (

          <Card className="border-red-500/40 p-4 text-sm text-red-400">{error}</Card>

        )}



        <Card className="overflow-x-auto p-0">

          <table className="w-full text-sm">

            <thead>

              <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-muted">

                <th className="p-3">Compétition / Tournoi</th>

                <th className="p-3">Dates</th>

                <th className="p-3">Lieu</th>

                <th className="p-3">Prévisionnel voyage</th>

                <th className="p-3 text-right">Actions</th>

              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>

                  <td colSpan={5} className="p-4 text-muted">

                    Chargement…

                  </td>

                </tr>

              ) : isEmpty ? (

                <tr>

                  <td colSpan={5} className="p-4 text-muted">

                    Aucun prévisionnel ni compétition.{" "}

                    <Link

                      href="/v2/budget/voyage-competition/nouveau"

                      className="text-[var(--frmt-gold)] underline"

                    >

                      Créer un prévisionnel

                    </Link>

                  </td>

                </tr>

              ) : (

                <>

                  {standaloneBudgets.map((b) => (

                    <tr key={b.id} className="border-b border-[var(--border)]/40">

                      <td className="p-3 font-medium">

                        {budgetLabel(b)}

                        <Badge variant="muted" className="ml-2 text-[10px]">

                          Autonome

                        </Badge>

                      </td>

                      <td className="p-3 text-muted">

                        {formatDate(b.date_debut)} → {formatDate(b.date_fin)}

                      </td>

                      <td className="p-3">{budgetLieu(b)}</td>

                      <td className="p-3">

                        <BudgetAmountCell b={b} />

                      </td>

                      <td className="p-3">

                        <div className="flex flex-wrap justify-end gap-1">

                          <Link

                            href={`/v2/budget/voyage-competition/${b.id}`}

                            className="inline-flex h-8 items-center rounded-md border border-[var(--border)] px-2 text-xs hover:bg-[var(--bg-elevated)]"

                          >

                            Modifier

                          </Link>

                          <Button

                            type="button"

                            size="sm"

                            variant="secondary"

                            className="h-8 gap-1 px-2 text-xs"

                            onClick={() => void exportPdf(b)}

                          >

                            <FileDown className="h-3 w-3" /> PDF

                          </Button>

                        </div>

                      </td>

                    </tr>

                  ))}

                  {competitions.map((c) => {

                    const linked = budgetsForCompetition(c);

                    const b0 = linked[0];

                    return (

                      <tr key={c.id} className="border-b border-[var(--border)]/40">

                        <td className="p-3 font-medium">{c.nom}</td>

                        <td className="p-3 text-muted">

                          {formatDate(c.date_debut)} → {formatDate(c.date_fin)}

                        </td>

                        <td className="p-3">{c.lieu ?? "—"}</td>

                        <td className="p-3">

                          {!b0 ? (

                            <Badge variant="muted">À créer</Badge>

                          ) : (

                            <BudgetAmountCell b={b0} />

                          )}

                        </td>

                        <td className="p-3">

                          <div className="flex flex-wrap justify-end gap-1">

                            <Link

                              href={`/competitions/${c.id}`}

                              className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--border)] px-2 text-xs hover:bg-[var(--bg-elevated)]"

                              title="Onglet Budget sur la fiche"

                            >

                              <ExternalLink className="h-3 w-3" /> Fiche

                            </Link>

                            <Link

                              href={`/v2/budget/voyage-competition/nouveau?competition_id=${c.id}&tournoi=${encodeURIComponent(c.nom)}`}

                              className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--frmt-gold)]/10 px-2 text-xs font-medium text-[var(--frmt-gold)] hover:bg-[var(--frmt-gold)]/20"

                            >

                              <Plus className="h-3 w-3" /> Créer budget

                            </Link>

                            {b0 && (

                              <>

                                <Link

                                  href={`/v2/budget/voyage-competition/${b0.id}`}

                                  className="inline-flex h-8 items-center rounded-md border border-[var(--border)] px-2 text-xs hover:bg-[var(--bg-elevated)]"

                                >

                                  Modifier

                                </Link>

                                <Button

                                  type="button"

                                  size="sm"

                                  variant="secondary"

                                  className="h-8 gap-1 px-2 text-xs"

                                  onClick={() => void exportPdf(b0)}

                                >

                                  <FileDown className="h-3 w-3" /> PDF

                                </Button>

                              </>

                            )}

                          </div>

                        </td>

                      </tr>

                    );

                  })}

                </>

              )}

            </tbody>

          </table>

        </Card>



        {!loading && (standaloneBudgets.length > 0 || withBudget.length > 0) && (

          <p className="text-xs text-muted">

            {standaloneBudgets.length > 0 && (

              <>

                {standaloneBudgets.length} prévisionnel(s) autonome

                {standaloneBudgets.length > 1 ? "s" : ""}

              </>

            )}

            {standaloneBudgets.length > 0 && withBudget.length > 0 && " · "}

            {withBudget.length > 0 && (

              <>

                {withBudget.length} compétition(s) avec budget sur {competitions.length}

              </>

            )}

          </p>

        )}

      </main>

    </>

  );

}


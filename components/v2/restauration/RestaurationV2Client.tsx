"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { V2PageActions } from "@/components/v2/V2PageActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { LogistiqueStageFiltersBar } from "@/components/v2/ui/LogistiqueStageFiltersBar";
import { EmptyState } from "@/components/v2/ui/EmptyState";
import { useDebounced } from "@/lib/hooks/useDebounced";
import {
  emptyLogistiqueFilters,
  filterLogistiqueStageRows,
  type LogistiqueStageFilters,
} from "@/lib/v2/logistique-stage-filters";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";
import { useToast } from "@/components/v2/ui/ToastProvider";
import {
  deleteRestauration,
  getFacturesPrestataires,
  getRestaurations,
  getStages,
  upsertFacturePrestataire,
} from "@/lib/supabase/queries";
import { exportRestaurationPDF } from "@/lib/pdf/pdf-exports";
import { countDaysInclusive } from "@/lib/v2/stage-calculations";
import type { FacturePrestataireV2, RestaurationStageV2, StageProgrammeV2 } from "@/lib/types/v2";
import { UtensilsCrossed } from "lucide-react";
import { uploadDocument } from "@/lib/storage/upload-document";
import { computeRestaurationPrevuMad } from "@/lib/v2/budget-centre-calcul";
import { buildMealTotals } from "@/lib/v2/restauration-meals";
import { useTarifsBudget } from "@/lib/v2/use-tarifs-budget";

export function RestaurationV2Client() {
  const { toast } = useToast();
  const tarifsBudget = useTarifsBudget();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<RestaurationStageV2[]>([]);
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [facturesByStage, setFacturesByStage] = useState<Record<string, FacturePrestataireV2>>({});
  const [filters, setFilters] = useState<LogistiqueStageFilters>(emptyLogistiqueFilters);
  const [repasFilter, setRepasFilter] = useState<"" | "pdj" | "dej" | "diner">("");
  const debouncedSearch = useDebounced(filters.search, 300);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [savingFacture, setSavingFacture] = useState<Record<string, boolean>>({});
  const [factureUrlByStage, setFactureUrlByStage] = useState<Record<string, string>>({});
  const [factureRefByStage, setFactureRefByStage] = useState<Record<string, string>>({});
  const [prestataireByStage, setPrestataireByStage] = useState<Record<string, string>>({});
  const [montantByStage, setMontantByStage] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [r, s, factures] = await Promise.all([getRestaurations(), getStages(), getFacturesPrestataires()]);
    setItems(r);
    setStages(s);
    const byStage: Record<string, FacturePrestataireV2> = {};
    const urls: Record<string, string> = {};
    const refs: Record<string, string> = {};
    const montants: Record<string, string> = {};
    const prestataires: Record<string, string> = {};
    for (const f of factures) {
      if (!f.stage_id || f.service_type !== "restauration") continue;
      byStage[f.stage_id] = f;
      urls[f.stage_id] = f.facture_url ?? "";
      refs[f.stage_id] = f.reference ?? "";
      montants[f.stage_id] = String(f.montant ?? 0);
      prestataires[f.stage_id] = f.prestataire_nom ?? "";
    }
    setFacturesByStage(byStage);
    setFactureUrlByStage(urls);
    setFactureRefByStage(refs);
    setPrestataireByStage(prestataires);
    setMontantByStage(montants);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const stageFromUrl = searchParams.get("stage");
    if (stageFromUrl) {
      setFilters((f) => ({ ...f, stageId: stageFromUrl }));
    }
  }, [searchParams]);

  const filtersForQuery = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const groups = useMemo(() => {
    const rows = filterLogistiqueStageRows(items, stages, filtersForQuery, (r) => {
      if (repasFilter === "pdj") return r.petit_dejeuner;
      if (repasFilter === "dej") return r.dejeuner;
      if (repasFilter === "diner") return r.diner;
      return true;
    });
    return rows.map(({ item: restauration, stage }) => ({ restauration, stage }));
  }, [items, stages, filtersForQuery, repasFilter]);

  async function confirmDelete() {
    if (!deleteId) return;
    await deleteRestauration(deleteId);
    toast("Restauration supprimée");
    setDeleteId(null);
    await load();
  }

  async function syncFactureRestauration(
    stage: StageProgrammeV2,
    r: RestaurationStageV2,
    cost: number,
    override?: { factureUrl?: string }
  ) {
    setSavingFacture((s) => ({ ...s, [stage.id]: true }));
    const montantManual = Number.parseFloat(montantByStage[stage.id] ?? "");
    const montantRestauration = Number.isFinite(montantManual) && montantManual >= 0 ? montantManual : cost;

    const data = await upsertFacturePrestataire({
      stage_id: stage.id,
      service_type: "restauration",
      prestataire_nom: prestataireByStage[stage.id] ?? "",
      montant: montantRestauration,
      facture_url: override?.factureUrl ?? factureUrlByStage[stage.id] ?? "",
      reference: factureRefByStage[stage.id] ?? "",
      notes: null,
    });
    setSavingFacture((s) => ({ ...s, [stage.id]: false }));
    if (data.error) {
      toast(data.error, "error");
      return;
    }
    toast("Facture restauration mise à jour", "success");
    await load();
  }

  async function uploadRestaurationFacture(stageId: string, file: File) {
    try {
      const url = await uploadDocument(file, `factures/restauration/${stageId}`);
      setFactureUrlByStage((s) => ({ ...s, [stageId]: url }));
      toast("Fichier facture uploadé", "success");
      const stage = stages.find((x) => x.id === stageId);
      const r = items.find((x) => x.stage_id === stageId);
      if (stage && r) {
        const jours = countDaysInclusive(r.date_debut, r.date_fin);
        const totals = buildMealTotals(r, jours);
        const autoCost = computeRestaurationPrevuMad(
          totals.pdj,
          totals.dej,
          totals.diner,
          tarifsBudget
        );
        await syncFactureRestauration(stage, r, autoCost, { factureUrl: url });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur upload facture", "error");
    }
  }

  function openFacture(url: string) {
    if (!url) {
      toast("Aucune URL facture enregistrée", "info");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function downloadFacture(url: string, stageName: string) {
    if (!url) {
      toast("Aucune URL facture enregistrée", "info");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = `facture-restauration-${stageName}.pdf`;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <>
      <V2PageHeader
        title="Restauration"
        description="Comptage repas par stage et par joueur"
        actions={
          <V2PageActions
            onExportPdf={() =>
              exportRestaurationPDF(
                groups.map(({ stage, restauration: r }) => ({
                  Stage: stage.stage_action,
                  Période: `${r.date_debut} → ${r.date_fin}`,
                  PDJ: r.petit_dejeuner ? "Oui" : "Non",
                  Déjeuner: r.dejeuner ? "Oui" : "Non",
                  Dîner: r.diner ? "Oui" : "Non",
                  Personnes: String(r.nb_personnes),
                  "Total repas": String(r.total_repas),
                  Statut: r.statut,
                })),
                groups.length
                  ? {
                      "TOTAL REPAS": String(groups.reduce((s, g) => s + g.restauration.total_repas, 0)),
                    }
                  : undefined
              )
            }
          />
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <LogistiqueStageFiltersBar
          stages={stages}
          filters={filters}
          onChange={setFilters}
          resultCount={groups.length}
          totalCount={items.length}
          extraFilters={
            <div>
              <Label>Type de repas</Label>
              <Select
                className="mt-1"
                value={repasFilter}
                onChange={(e) => setRepasFilter(e.target.value as "" | "pdj" | "dej" | "diner")}
              >
                <option value="">Tous</option>
                <option value="pdj">Avec petit-déjeuner</option>
                <option value="dej">Avec déjeuner</option>
                <option value="diner">Avec dîner</option>
              </Select>
            </div>
          }
        />

        {groups.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title={items.length === 0 ? "Aucune restauration" : "Aucun résultat"}
            description={
              items.length === 0 ?
                "Les repas apparaissent ici lors de la création d'un stage avec restauration."
              : "Modifiez les filtres ou réinitialisez la recherche."
            }
          />
        ) : (
          groups.map(({ stage, restauration: r }) => {
            const jours = countDaysInclusive(r.date_debut, r.date_fin);
            const totals = buildMealTotals(r, jours);
            const budgetPrevMad = computeRestaurationPrevuMad(
              totals.pdj,
              totals.dej,
              totals.diner,
              tarifsBudget
            );
            const cost = budgetPrevMad;
            const facture = facturesByStage[stage.id];

            return (
              <Card key={r.id} className="overflow-hidden bg-[var(--bg-card)] p-0">
                <div className="border-b border-[var(--border)] p-4">
                  <p className="text-lg font-semibold">
                    🍽️ {stage.stage_action} — {jours} jour{jours > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="overflow-x-auto p-4">
                  <table className="v2-data-table w-full text-sm">
                    <thead>
                      <tr>
                        <th className="p-2 text-left">Nom</th>
                        <th className="p-2 text-center">PDJ</th>
                        <th className="p-2 text-center">Déj</th>
                        <th className="p-2 text-center">Dîner</th>
                        <th className="p-2 text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-bold">
                        <td className="p-2">TOTAL</td>
                        <td className="p-2 text-center">{totals.pdj}</td>
                        <td className="p-2 text-center">{totals.dej}</td>
                        <td className="p-2 text-center">{totals.diner}</td>
                        <td className="p-2 text-center">{totals.total} repas</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] p-4">
                  <div>
                    <p className="font-medium">Budget prévisionnel : {cost.toLocaleString("fr-FR")} MAD</p>
                    <p className="text-xs text-muted">
                      Montant réel facture (enregistré) : {(facture?.montant ?? 0).toLocaleString("fr-FR")}{" "}
                      MAD — cliquez « Sauvegarder » pour aligner sur les tarifs paramètres.
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Nom prestataire"
                        value={prestataireByStage[stage.id] ?? ""}
                        onChange={(e) =>
                          setPrestataireByStage((s) => ({ ...s, [stage.id]: e.target.value }))
                        }
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Montant facture (MAD)"
                        value={montantByStage[stage.id] ?? String(facture?.montant ?? cost)}
                        onChange={(e) =>
                          setMontantByStage((s) => ({ ...s, [stage.id]: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="URL facture prestataire"
                        value={factureUrlByStage[stage.id] ?? ""}
                        onChange={(e) =>
                          setFactureUrlByStage((s) => ({ ...s, [stage.id]: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="Référence facture"
                        value={factureRefByStage[stage.id] ?? ""}
                        onChange={(e) =>
                          setFactureRefByStage((s) => ({ ...s, [stage.id]: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-md border border-border px-2 py-1 text-xs">
                      Joindre fichier
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadRestaurationFacture(stage.id, file);
                        }}
                      />
                    </label>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!!savingFacture[stage.id]}
                      onClick={() => void syncFactureRestauration(stage, r, cost)}
                    >
                      {savingFacture[stage.id] ? "Enregistrement..." : "Sauvegarder prestataire + montant"}
                    </Button>
                    <Link href={`/v2/stages/${stage.id}`}>
                      <Button variant="secondary" size="sm">
                        Détail stage
                      </Button>
                    </Link>
                    {factureUrlByStage[stage.id] ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openFacture(factureUrlByStage[stage.id])}
                          className="inline-flex items-center rounded-md border border-border px-2 py-1 text-xs text-frmt-green hover:underline"
                        >
                          Aperçu facture
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadFacture(factureUrlByStage[stage.id], stage.stage_action)}
                          className="inline-flex items-center rounded-md border border-border px-2 py-1 text-xs text-[var(--text-secondary)] hover:underline"
                        >
                          Télécharger facture
                        </button>
                      </>
                    ) : null}
                    <Button variant="danger" size="sm" onClick={() => setDeleteId(r.id)}>
                      Supprimer
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </main>

      <ConfirmDialog
        open={!!deleteId}
        title="Supprimer cette restauration ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer définitivement"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}

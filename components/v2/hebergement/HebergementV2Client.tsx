"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { V2PageActions } from "@/components/v2/V2PageActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { LogistiqueStageFiltersBar } from "@/components/v2/ui/LogistiqueStageFiltersBar";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import { useDebounced } from "@/lib/hooks/useDebounced";
import {
  emptyLogistiqueFilters,
  filterLogistiqueStageRows,
  type LogistiqueStageFilters,
} from "@/lib/v2/logistique-stage-filters";
import { EmptyState } from "@/components/v2/ui/EmptyState";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { getHebergements, getStages, deleteHebergement, getFacturesPrestataires, upsertFacturePrestataire } from "@/lib/supabase/queries";
import { exportHebergementPDF } from "@/lib/pdf/pdf-exports";
import { countNightsHebergement } from "@/lib/v2/stage-calculations";
import type { FacturePrestataireV2, HebergementStageV2, StageProgrammeV2 } from "@/lib/types/v2";
import { Hotel } from "lucide-react";
import { uploadDocument } from "@/lib/storage/upload-document";
import { computeHebergementPrevuMad } from "@/lib/v2/budget-centre-calcul";
import { useTarifsBudget } from "@/lib/v2/use-tarifs-budget";

export function HebergementV2Client() {
  const { toast } = useToast();
  const tarifsBudget = useTarifsBudget();
  const [items, setItems] = useState<HebergementStageV2[]>([]);
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [facturesByStage, setFacturesByStage] = useState<Record<string, FacturePrestataireV2>>({});
  const [filters, setFilters] = useState<LogistiqueStageFilters>(emptyLogistiqueFilters);
  const [kitchenetteFilter, setKitchenetteFilter] = useState<"" | "yes" | "no">("");
  const debouncedSearch = useDebounced(filters.search, 300);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [factureUrlByStage, setFactureUrlByStage] = useState<Record<string, string>>({});
  const [factureRefByStage, setFactureRefByStage] = useState<Record<string, string>>({});
  const [prestataireByStage, setPrestataireByStage] = useState<Record<string, string>>({});
  const [montantByStage, setMontantByStage] = useState<Record<string, string>>({});
  const [savingFactureByStage, setSavingFactureByStage] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const [h, s, factures] = await Promise.all([getHebergements(), getStages(), getFacturesPrestataires()]);
    setItems(h);
    setStages(s);
    const byStage: Record<string, FacturePrestataireV2> = {};
    const urls: Record<string, string> = {};
    const refs: Record<string, string> = {};
    const montants: Record<string, string> = {};
    const prestataires: Record<string, string> = {};
    for (const f of factures) {
      if (!f.stage_id || f.service_type !== "hebergement") continue;
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

  const filtersForQuery = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const groups = useMemo(() => {
    const rows = filterLogistiqueStageRows(items, stages, filtersForQuery, (h) => {
      if (kitchenetteFilter === "yes") return Boolean(h.kitchenette);
      if (kitchenetteFilter === "no") return !h.kitchenette;
      return true;
    });
    return rows.map(({ item: hebergement, stage }) => ({ stage, hebergement }));
  }, [items, stages, filtersForQuery, kitchenetteFilter]);

  async function confirmDelete() {
    if (!deleteId) return;
    await deleteHebergement(deleteId);
    toast("Hébergement supprimé");
    setDeleteId(null);
    await load();
  }

  async function saveHebergementFacture(stageId: string, override?: { factureUrl?: string }) {
    setSavingFactureByStage((s) => ({ ...s, [stageId]: true }));
    const montant = Number.parseFloat(montantByStage[stageId] ?? "0") || 0;
    const res = await upsertFacturePrestataire({
      stage_id: stageId,
      service_type: "hebergement",
      prestataire_nom: prestataireByStage[stageId] ?? "",
      montant: Math.max(0, montant),
      facture_url: override?.factureUrl ?? factureUrlByStage[stageId] ?? "",
      reference: factureRefByStage[stageId] ?? "",
      notes: null,
    });
    setSavingFactureByStage((s) => ({ ...s, [stageId]: false }));
    if (res.error) {
      toast(res.error, "error");
      return;
    }
    toast("Facture hébergement attachée", "success");
    await load();
  }

  async function uploadHebergementFacture(stageId: string, file: File) {
    try {
      const url = await uploadDocument(file, `factures/hebergement/${stageId}`);
      setFactureUrlByStage((s) => ({ ...s, [stageId]: url }));
      toast("Fichier facture uploadé", "success");
      await saveHebergementFacture(stageId, { factureUrl: url });
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
    a.download = `facture-hebergement-${stageName}.pdf`;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function statutEmoji(statut: string) {
    if (statut === "confirme" || statut === "confirmé") return "🟢 Confirmé";
    if (statut === "annule") return "🔴 Annulé";
    return "🟡 Non confirmé";
  }

  return (
    <>
      <V2PageHeader
        title="Hébergement"
        description="Vue par stage — chambres et nuitées"
        actions={
          <V2PageActions
            onExportPdf={() =>
              exportHebergementPDF(
                groups.map(({ stage, hebergement: r }) => ({
                  Stage: stage.stage_action,
                  Début: r.date_debut,
                  Fin: r.date_fin,
                  "Ch. joueurs": String(r.nb_chambres_joueurs ?? r.chambres ?? 0),
                  "Ch. coachs": String(r.nb_chambres_coachs ?? 0),
                  Kitchenette: r.kitchenette ? "Oui" : "Non",
                  Statut: r.statut,
                }))
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
              <Label>Kitchenette</Label>
              <Select
                className="mt-1"
                value={kitchenetteFilter}
                onChange={(e) => setKitchenetteFilter(e.target.value as "" | "yes" | "no")}
              >
                <option value="">Toutes</option>
                <option value="yes">Avec kitchenette</option>
                <option value="no">Sans kitchenette</option>
              </Select>
            </div>
          }
        />

        {groups.length === 0 ? (
          <EmptyState
            icon={Hotel}
            title={items.length === 0 ? "Aucun hébergement" : "Aucun résultat"}
            description={
              items.length === 0 ?
                "Créez un stage avec hébergement activé pour voir les attributions ici."
              : "Modifiez les filtres ou réinitialisez la recherche."
            }
            actionLabel="Voir les stages"
            onAction={() => (window.location.href = "/v2/stages")}
          />
        ) : (
          groups.map(({ stage, hebergement: h }) => {
            const nbNuits = countNightsHebergement(h.date_debut, h.date_fin);
            const chJoueurs = h.nb_chambres_joueurs ?? h.chambres ?? 0;
            const chCoachs = h.nb_chambres_coachs ?? 0;
            const totalCh = chJoueurs + chCoachs;
            const nuitees = totalCh * nbNuits;
            const budgetPrevMad = computeHebergementPrevuMad(
              chJoueurs,
              chCoachs,
              nbNuits,
              tarifsBudget
            );
            const montantReelMad = Number(facturesByStage[stage.id]?.montant ?? 0);
            const start = parseISO(h.date_debut.includes("T") ? h.date_debut : `${h.date_debut}T12:00:00`);
            const end = parseISO(h.date_fin.includes("T") ? h.date_fin : `${h.date_fin}T12:00:00`);

            return (
              <Card key={h.id} className="overflow-hidden border-[var(--border)] bg-[var(--bg-card)] p-0">
                <div className="border-b border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold">🏨 {stage.stage_action}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {format(start, "dd", { locale: fr })} → {format(end, "dd MMM yyyy", { locale: fr })} ·{" "}
                        {stage.lieu ?? "—"}
                      </p>
                    </div>
                    <StatusBadge statut={h.statut} />
                  </div>
                </div>
                <div className="space-y-2 p-4 text-sm">
                  <p>👥 Joueurs : {chJoueurs} chambre{chJoueurs !== 1 ? "s" : ""}</p>
                  <p>👤 Staff/Coaches : {chCoachs} chambre{chCoachs !== 1 ? "s" : ""}</p>
                  {h.kitchenette && <p>🍳 Kitchenette incluse</p>}
                  <div className="my-2 border-t border-[var(--border)]" />
                  <p className="font-medium">
                    Total : {totalCh} chambres · {nbNuits} nuit{nbNuits !== 1 ? "s" : ""} · {nuitees} nuitées
                  </p>
                  <p>Budget prévisionnel : {budgetPrevMad.toLocaleString("fr-FR")} MAD</p>
                  <p>
                    Montant réel (facture enregistrée) : {montantReelMad.toLocaleString("fr-FR")} MAD — mettez à jour
                    via « Enregistrer facture » après changement des tarifs.
                  </p>
                  <p>Statut : {statutEmoji(h.statut)}</p>
                  <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--bg-main)] p-3">
                    <p className="mb-2 font-medium">Facture prestataire (hébergement)</p>
                    <div className="grid gap-2 sm:grid-cols-2">
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
                        value={montantByStage[stage.id] ?? String(facturesByStage[stage.id]?.montant ?? 0)}
                        onChange={(e) =>
                          setMontantByStage((s) => ({ ...s, [stage.id]: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="URL facture (PDF/image)"
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
                    <div className="mt-2 flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center rounded-md border border-border px-2 py-1 text-xs">
                        Joindre fichier
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadHebergementFacture(stage.id, file);
                          }}
                        />
                      </label>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={!!savingFactureByStage[stage.id]}
                        onClick={() => void saveHebergementFacture(stage.id)}
                      >
                        {savingFactureByStage[stage.id] ? "Enregistrement..." : "Sauvegarder prestataire + montant"}
                      </Button>
                      {factureUrlByStage[stage.id] ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openFacture(factureUrlByStage[stage.id])}
                            className="text-xs text-frmt-green hover:underline"
                          >
                            Aperçu facture
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadFacture(factureUrlByStage[stage.id], stage.stage_action)}
                            className="text-xs text-[var(--text-secondary)] hover:underline"
                          >
                            Télécharger facture
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-[var(--border)] p-4">
                  <Link href={`/v2/stages/${stage.id}`}>
                    <Button variant="secondary" size="sm">
                      ✏️ Modifier
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      exportHebergementPDF([
                        {
                          Stage: stage.stage_action,
                          Début: h.date_debut,
                          Fin: h.date_fin,
                          "Ch. joueurs": String(chJoueurs),
                          "Ch. coachs": String(chCoachs),
                          Kitchenette: h.kitchenette ? "Oui" : "Non",
                          Statut: h.statut,
                        },
                      ])
                    }
                  >
                    📄 Fiche PDF
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteId(h.id)}>
                    Supprimer
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </main>

      <ConfirmDialog
        open={!!deleteId}
        title="Supprimer cet hébergement ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer définitivement"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}

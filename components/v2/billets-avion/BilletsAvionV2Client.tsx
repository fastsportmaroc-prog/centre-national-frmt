"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { V2PageActions } from "@/components/v2/V2PageActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";
import { EmptyState } from "@/components/v2/ui/EmptyState";
import { useToast } from "@/components/v2/ui/ToastProvider";
import {
  deleteDemandeBillet,
  getBilletsAvion,
  getStages,
  updateDemandeBillet,
} from "@/lib/supabase/queries";
import { exportBilletsPdf } from "@/lib/pdf/pdf-exports";
import { billetPrixEnMad, formatBilletMontantMad } from "@/lib/v2/billets-currency";
import type { CompetitionBilletFacture, CompetitionBilletHubRow } from "@/lib/types/competition";
import type { DemandeBilletAvionV2 } from "@/lib/types/v2";
import { ExternalLink, Plane, Trash2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const statutClass: Record<string, string> = {
  demande: "bg-zinc-700 text-zinc-200",
  confirme: "bg-emerald-500/20 text-emerald-300",
  annule: "bg-red-500/20 text-red-300",
  rembourse: "bg-orange-500/20 text-orange-300",
  en_attente: "bg-amber-500/20 text-amber-200",
  reserve: "bg-sky-500/20 text-sky-200",
};

type SourceFilter = "all" | "stages" | "competitions";

export function BilletsAvionV2Client() {
  const searchParams = useSearchParams();
  const initialCompetition = searchParams.get("competition") ?? "";
  const { toast } = useToast();
  const [source, setSource] = useState<SourceFilter>(
    initialCompetition ? "competitions" : "all"
  );
  const [items, setItems] = useState<DemandeBilletAvionV2[]>([]);
  const [compBillets, setCompBillets] = useState<CompetitionBilletHubRow[]>([]);
  const [compFactures, setCompFactures] = useState<CompetitionBilletFacture[]>([]);
  const [stages, setStages] = useState<Awaited<ReturnType<typeof getStages>>>([]);
  const [filterStage, setFilterStage] = useState("");
  const [filterCompetition, setFilterCompetition] = useState(initialCompetition);
  const [filterStatut, setFilterStatut] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DemandeBilletAvionV2 | null>(null);

  const load = useCallback(async () => {
    const [b, s, hubRes] = await Promise.all([
      getBilletsAvion(),
      getStages(),
      fetch("/api/competitions/billets-hub"),
    ]);
    setItems(b);
    setStages(s);
    const hubJson = await hubRes.json();
    setCompBillets(hubJson.billets ?? []);
    setCompFactures(hubJson.factures ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const competitions = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of compBillets) map.set(b.competition_id, b.competition_nom);
    return [...map.entries()].map(([id, nom]) => ({ id, nom }));
  }, [compBillets]);

  const filteredStages = useMemo(() => {
    return items.filter((b) => {
      if (filterStage && b.stage_id !== filterStage) return false;
      if (filterStatut && b.statut !== filterStatut) return false;
      return true;
    });
  }, [items, filterStage, filterStatut]);

  const filteredComp = useMemo(() => {
    return compBillets.filter((b) => {
      if (filterCompetition && b.competition_id !== filterCompetition) return false;
      if (filterStatut && b.statut !== filterStatut) return false;
      return true;
    });
  }, [compBillets, filterCompetition, filterStatut]);

  const stageCostMad = filteredStages.reduce(
    (s, b) => s + billetPrixEnMad(Number(b.prix_unitaire), b.devise),
    0
  );
  const compCostMad = filteredComp.reduce(
    (s, b) => s + billetPrixEnMad(Number(b.montant ?? 0), b.devise),
    0
  );
  const factureMad = compFactures
    .filter((f) => !filterCompetition || f.competition_id === filterCompetition)
    .reduce((s, f) => s + Number(f.montant), 0);
  const stageNames = Object.fromEntries(stages.map((s) => [s.id, s.stage_action]));

  const showStages = source === "all" || source === "stages";
  const showComp = source === "all" || source === "competitions";

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await deleteDemandeBillet(deleteTarget.id);
    toast("Demande billet supprimée");
    setDeleteTarget(null);
    await load();
  }

  function exportPdf() {
    const rows = [
      ...filteredStages.map((b) => [
        b.personne_nom,
        b.personne_prenom,
        b.personne_type,
        `${b.date_depart} ${b.aeroport_depart}`,
        `${b.date_retour} ${b.aeroport_retour}`,
        formatBilletMontantMad(Number(b.prix_unitaire), b.devise),
      ]),
      ...filteredComp.map((b) => [
        b.competition_nom,
        b.participant_nom,
        b.participant_type,
        `${b.type} ${b.date_vol}`,
        b.aeroport_depart ?? "",
        b.montant != null ? formatBilletMontantMad(Number(b.montant), b.devise) : "—",
      ]),
    ];
    exportBilletsPdf(rows, stageCostMad + compCostMad);
  }

  return (
    <>
      <V2PageHeader
        title="Billets avion"
        description="Stages, compétitions — montants individuels ou groupe, factures prestataires"
        actions={<V2PageActions onExportPdf={exportPdf} exportLabel="Exporter PDF officiel" />}
      />
      <main className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Tout"],
              ["stages", "Stages"],
              ["competitions", "Compétitions"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSource(id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium",
                source === id
                  ? "border-frmt-green bg-frmt-green/20 text-white"
                  : "border-border text-muted hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <Card className="p-3 text-sm">
            <p className="text-muted">Stages (demandés)</p>
            <p className="text-xl font-bold">
              {filteredStages.filter((b) => b.statut === "demande").length}
            </p>
          </Card>
          <Card className="p-3 text-sm">
            <p className="text-muted">Compétitions (billets)</p>
            <p className="text-xl font-bold">{filteredComp.length}</p>
          </Card>
          <Card className="p-3 text-sm">
            <p className="text-muted">Coût stages</p>
            <p className="text-xl font-bold">{formatBilletMontantMad(stageCostMad, "MAD")}</p>
          </Card>
          <Card className="p-3 text-sm">
            <p className="text-muted">Coût compétitions / factures</p>
            <p className="text-xl font-bold">
              {formatBilletMontantMad(Math.max(compCostMad, factureMad), "MAD")}
            </p>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          {showStages && (
            <Select value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
              <option value="">Tous les stages</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.stage_action}
                </option>
              ))}
            </Select>
          )}
          {showComp && (
            <Select
              value={filterCompetition}
              onChange={(e) => setFilterCompetition(e.target.value)}
            >
              <option value="">Toutes les compétitions</option>
              {competitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </Select>
          )}
          <Select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
            <option value="">Tous statuts</option>
            <option value="demande">Demandé</option>
            <option value="confirme">Confirmé</option>
            <option value="en_attente">En attente</option>
            <option value="reserve">Réservé</option>
            <option value="annule">Annulé</option>
          </Select>
        </div>

        {showComp && compFactures.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Trophy className="h-4 w-4 text-frmt-gold" />
              Factures prestataires — compétitions
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {compFactures
                .filter((f) => !filterCompetition || f.competition_id === filterCompetition)
                .map((f) => {
                  const nom =
                    competitions.find((c) => c.id === f.competition_id)?.nom ?? "Compétition";
                  return (
                    <div
                      key={f.competition_id}
                      className="rounded-lg border border-[var(--border)] p-3 text-sm"
                    >
                      <p className="font-medium">{nom}</p>
                      <p className="text-muted">{f.prestataire_nom ?? "Prestataire"}</p>
                      <p className="mt-1 font-bold text-frmt-gold">
                        {formatBilletMontantMad(f.montant, f.devise ?? "MAD")}
                      </p>
                      {f.reference && (
                        <p className="text-xs text-muted">Réf. {f.reference}</p>
                      )}
                      <Link
                        href={`/competitions/${f.competition_id}?tab=billets`}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-frmt-green hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Onglet billets
                      </Link>
                    </div>
                  );
                })}
            </div>
          </Card>
        )}

        {showStages && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <p className="border-b border-border bg-[#161b22] px-3 py-2 text-sm font-semibold">
              Billets stages
            </p>
            {filteredStages.length === 0 ? (
              <EmptyState
                icon={Plane}
                title="Aucun billet stage"
                description="Aucun billet stage ne correspond aux filtres."
              />
            ) : (
              <table className="v2-data-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2">Stage</th>
                    <th className="p-2">Personne</th>
                    <th className="p-2">Vol aller</th>
                    <th className="p-2">Vol retour</th>
                    <th className="p-2">Prix</th>
                    <th className="p-2">Statut</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStages.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="p-2">{stageNames[b.stage_id] ?? "—"}</td>
                      <td className="p-2">
                        {b.personne_prenom} {b.personne_nom} ({b.personne_type})
                      </td>
                      <td className="p-2">
                        {b.date_depart} {b.aeroport_depart}
                      </td>
                      <td className="p-2">
                        {b.date_retour} {b.aeroport_retour}
                      </td>
                      <td className="p-2">
                        {b.prix_unitaire} {b.devise}
                      </td>
                      <td className="p-2">
                        <select
                          className={cn(
                            "rounded px-2 py-0.5 text-xs",
                            statutClass[b.statut] ?? statutClass.demande
                          )}
                          value={b.statut}
                          onChange={(e) =>
                            void updateDemandeBillet(b.id, {
                              statut: e.target.value as DemandeBilletAvionV2["statut"],
                            }).then(load)
                          }
                        >
                          <option value="demande">Demandé</option>
                          <option value="confirme">Confirmé</option>
                          <option value="annule">Annulé</option>
                          <option value="rembourse">Remboursé</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget(b)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {showComp && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <p className="border-b border-border bg-[#161b22] px-3 py-2 text-sm font-semibold">
              Billets compétitions
            </p>
            {filteredComp.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="Aucun billet compétition"
                description="Créez des billets depuis l'onglet Billets Avion d'une compétition."
              />
            ) : (
              <table className="v2-data-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2">Compétition</th>
                    <th className="p-2">Participant</th>
                    <th className="p-2">Sens</th>
                    <th className="p-2">Trajet / Date</th>
                    <th className="p-2 text-right">Montant</th>
                    <th className="p-2">Statut</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredComp.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="p-2">{b.competition_nom}</td>
                      <td className="p-2">
                        {b.participant_nom} ({b.participant_type})
                      </td>
                      <td className="p-2 capitalize">{b.type}</td>
                      <td className="p-2 text-xs">
                        {b.aeroport_depart ?? "—"}
                        {b.aeroport_retour ? ` → ${b.aeroport_retour}` : ""}
                        <br />
                        {b.date_vol} {b.heure ?? ""}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {b.montant != null
                          ? formatBilletMontantMad(Number(b.montant), b.devise)
                          : "—"}
                      </td>
                      <td className="p-2">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-xs capitalize",
                            statutClass[b.statut] ?? ""
                          )}
                        >
                          {b.statut.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        <Link href={`/competitions/${b.competition_id}`}>
                          <Button size="sm" variant="secondary">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer cette demande billet ?"
        description="Cette action est irréversible."
        confirmLabel="Supprimer définitivement"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </>
  );
}

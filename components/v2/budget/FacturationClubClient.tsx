"use client";

import { useEffect, useMemo, useState } from "react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import {
  getFacturesClub,
  getHebergementByStage,
  getPlanningByStage,
  getRestaurationByStage,
  getStages,
  upsertFactureClub,
} from "@/lib/supabase/queries";
import { exportListePdf } from "@/lib/pdf/pdf-exports";
import { calcFacturationClub } from "@/lib/v2/logistique-operationnelle";
import type { StageProgrammeV2 } from "@/lib/types/v2";
import { useTarifsBudget } from "@/lib/v2/use-tarifs-budget";

export function FacturationClubClient() {
  const tarifsBudget = useTarifsBudget();
  const [stages, setStages] = useState<StageProgrammeV2[]>([]);
  const [stageId, setStageId] = useState("");
  const [history, setHistory] = useState<
    { id: string; stage_id?: string | null; montant_total: number; statut: string; date_paiement?: string | null; reference_paiement?: string | null }[]
  >([]);
  const [calc, setCalc] = useState({
    nuits: 0,
    pdj: 0,
    dej: 0,
    din: 0,
    heuresTerrains: 0,
    montantHebergement: 0,
    montantRestauration: 0,
    montantTerrains: 0,
    montantTotal: 0,
  });

  useEffect(() => {
    (async () => {
      const [s, f] = await Promise.all([getStages(), getFacturesClub()]);
      setStages(s);
      setHistory(f);
      if (s[0]) setStageId(s[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!stageId) return;
    (async () => {
      const stage = stages.find((s) => s.id === stageId);
      if (!stage) return;
      const [h, r, p] = await Promise.all([
        getHebergementByStage(stage.id),
        getRestaurationByStage(stage.id),
        getPlanningByStage(stage.id),
      ]);
      setCalc(calcFacturationClub({ stage, hebergement: h, restauration: r, planning: p }, tarifsBudget));
    })();
  }, [stageId, stages, tarifsBudget]);

  const stage = useMemo(() => stages.find((s) => s.id === stageId), [stages, stageId]);

  async function saveFacture(statut: "brouillon" | "en_attente" | "paye") {
    if (!stage) return;
    await upsertFactureClub({
      stage_id: stage.id,
      montant_hebergement: calc.montantHebergement,
      montant_restauration: calc.montantRestauration,
      montant_terrains: calc.montantTerrains,
      montant_total: calc.montantTotal,
      statut,
      date_emission: new Date().toISOString().slice(0, 10),
      date_paiement: statut === "paye" ? new Date().toISOString().slice(0, 10) : null,
      reference_paiement: statut === "paye" ? `V-${Math.floor(Math.random() * 999)}` : null,
      notes: "Facturation CNE",
    });
    setHistory(await getFacturesClub());
  }

  function exportFacturePdf() {
    if (!stage) return;
    exportListePdf(
      `BON DE COMMANDE / ORDRE DE PAIEMENT — ${stage.stage_action}`,
      ["Poste", "Montant MAD"],
      [
        ["Hébergement", calc.montantHebergement.toLocaleString("fr-FR")],
        ["Restauration", calc.montantRestauration.toLocaleString("fr-FR")],
        ["Terrains", calc.montantTerrains.toLocaleString("fr-FR")],
        ["TOTAL", calc.montantTotal.toLocaleString("fr-FR")],
      ],
      `facture-club-${stage.id}.pdf`
    );
  }

  return (
    <>
      <V2PageHeader
        title="Facturation CNE"
        description="Bon de commande et suivi des factures — Centre National d'Entraînement"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportFacturePdf}>
              📄 Générer facture PDF officielle
            </Button>
          </div>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Card className="p-4">
          <Select value={stageId} onChange={(e) => setStageId(e.target.value)}>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.stage_action}
              </option>
            ))}
          </Select>
        </Card>

        {stage && (
          <Card className="space-y-3 p-4">
            <p className="text-lg font-semibold">{stage.stage_action} — {stage.date_debut} au {stage.date_fin}</p>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>Hébergement: {calc.montantHebergement.toLocaleString("fr-FR")} MAD</p>
              <p>Restauration: {calc.montantRestauration.toLocaleString("fr-FR")} MAD</p>
              <p>Terrains: {calc.montantTerrains.toLocaleString("fr-FR")} MAD</p>
              <p className="font-bold text-[var(--frmt-gold)]">TOTAL: {calc.montantTotal.toLocaleString("fr-FR")} MAD</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => void saveFacture("brouillon")}>Sauver brouillon</Button>
              <Button variant="secondary" onClick={() => void saveFacture("en_attente")}>Marquer en attente</Button>
              <Button onClick={() => void saveFacture("paye")}>Marquer payé</Button>
            </div>
          </Card>
        )}

        <Card className="overflow-x-auto p-0">
          <table className="v2-data-table w-full text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left">Stage</th>
                <th className="p-3 text-left">Montant</th>
                <th className="p-3 text-left">Statut</th>
                <th className="p-3 text-left">Date pmt</th>
                <th className="p-3 text-left">Ref.</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="p-3">{stages.find((s) => s.id === h.stage_id)?.stage_action ?? "—"}</td>
                  <td className="p-3">{h.montant_total?.toLocaleString("fr-FR")} MAD</td>
                  <td className="p-3">{h.statut}</td>
                  <td className="p-3">{h.date_paiement ?? "—"}</td>
                  <td className="p-3">{h.reference_paiement ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}


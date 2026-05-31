"use client";

import { useEffect, useMemo, useState } from "react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  getEntraineursByStage,
  getHebergementByStage,
  getJoueursByStage,
  getPlanningByStage,
  getRestaurationByStage,
  getStageById,
} from "@/lib/supabase/queries";
import { exportListePdf } from "@/lib/pdf/pdf-exports";
import { calcFacturationClub } from "@/lib/v2/logistique-operationnelle";
import { useTarifsBudget } from "@/lib/v2/use-tarifs-budget";

export function BilanStageClient({ stageId }: { stageId: string }) {
  const tarifsBudget = useTarifsBudget();
  const [stage, setStage] = useState<Awaited<ReturnType<typeof getStageById>>>(null);
  const [joueurs, setJoueurs] = useState<Awaited<ReturnType<typeof getJoueursByStage>>>([]);
  const [coaches, setCoaches] = useState<Awaited<ReturnType<typeof getEntraineursByStage>>>([]);
  const [hebergement, setHebergement] = useState<Awaited<ReturnType<typeof getHebergementByStage>>>(null);
  const [restauration, setRestauration] = useState<Awaited<ReturnType<typeof getRestaurationByStage>>>(null);
  const [planning, setPlanning] = useState<Awaited<ReturnType<typeof getPlanningByStage>>>([]);
  const [observations, setObservations] = useState("");
  const [recommandations, setRecommandations] = useState("");

  useEffect(() => {
    (async () => {
      const s = await getStageById(stageId);
      setStage(s);
      if (!s) return;
      const [j, c, h, r, p] = await Promise.all([
        getJoueursByStage(s.id),
        getEntraineursByStage(s.id),
        getHebergementByStage(s.id),
        getRestaurationByStage(s.id),
        getPlanningByStage(s.id),
      ]);
      setJoueurs(j);
      setCoaches(c);
      setHebergement(h);
      setRestauration(r);
      setPlanning(p);
    })();
  }, [stageId]);

  const finance = useMemo(
    () =>
      stage ? calcFacturationClub({ stage, hebergement, restauration, planning }, tarifsBudget) : null,
    [stage, hebergement, restauration, planning, tarifsBudget]
  );

  function exportBilanPdf() {
    if (!stage || !finance) return;
    exportListePdf(
      `BILAN DE STAGE — ${stage.stage_action}`,
      ["Section", "Valeur"],
      [
        ["Dates", `${stage.date_debut} au ${stage.date_fin}`],
        ["Lieu", stage.lieu ?? "Club de l'Agriculture, Rabat"],
        ["Joueurs", String(joueurs.length)],
        ["Coaches", String(coaches.length)],
        ["Séances", String(planning.length)],
        ["Repas", String(restauration?.total_repas ?? 0)],
        ["Coût hébergement", `${finance.montantHebergement.toLocaleString("fr-FR")} MAD`],
        ["Coût restauration", `${finance.montantRestauration.toLocaleString("fr-FR")} MAD`],
        ["Coût terrains", `${finance.montantTerrains.toLocaleString("fr-FR")} MAD`],
        ["TOTAL", `${finance.montantTotal.toLocaleString("fr-FR")} MAD`],
        ["Observations", observations || "—"],
        ["Recommandations", recommandations || "—"],
      ],
      `bilan-stage-${stage.id}.pdf`
    );
  }

  if (!stage) return <main className="p-6">Stage introuvable.</main>;

  return (
    <>
      <V2PageHeader
        title={`Bilan de stage — ${stage.stage_action}`}
        actions={<Button onClick={exportBilanPdf}>📄 Générer PDF bilan</Button>}
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Card className="space-y-2 p-4 text-sm">
          <p>Dates : {stage.date_debut} au {stage.date_fin}</p>
          <p>Lieu : {stage.lieu ?? "Club de l'Agriculture, Rabat"}</p>
          <p>Catégorie : {stage.categorie}</p>
          <p>Participants : {joueurs.length} joueurs • {coaches.length} coaches</p>
          <p>Volume entraînement : {planning.length} séances</p>
          <p>Hébergement : {hebergement ? "Configuré" : "Non"}</p>
          <p>Restauration : {restauration?.total_repas ?? 0} repas</p>
          {finance && <p className="font-semibold">Total financier : {finance.montantTotal.toLocaleString("fr-FR")} MAD</p>}
        </Card>
        <Card className="space-y-2 p-4">
          <label className="text-sm">Observations responsable logistique</label>
          <textarea
            className="h-24 w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />
          <label className="text-sm">Recommandations prochains stages</label>
          <textarea
            className="h-24 w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm"
            value={recommandations}
            onChange={(e) => setRecommandations(e.target.value)}
          />
        </Card>
      </main>
    </>
  );
}


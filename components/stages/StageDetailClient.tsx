"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getStageById } from "@/lib/data/stages";
import { getStageAutomatisation, synchroniserStage } from "@/lib/data/stage-operations";
import { getInfrastructures } from "@/lib/data/infrastructures";
import { getEntraineurs } from "@/lib/data/entraineurs";
import type { StageProgramme } from "@/lib/types/stages";
import type { StageAutomatisation } from "@/lib/data/stage-operations";
import { formatDate } from "@/lib/utils/dates";
import { statutStageLabel } from "@/lib/utils/stage-automation";
import { buildStageFicheReport } from "@/lib/reports/stage-fiche";
import { exportPdfReport, openPrintReport } from "@/lib/export/reports";
import { ArrowLeft, FileDown, Printer, RefreshCw } from "lucide-react";

type Props = { id: string };

export function StageDetailClient({ id }: Props) {
  const [stage, setStage] = useState<StageProgramme | null>(null);
  const [auto, setAuto] = useState<StageAutomatisation | null>(null);
  const [infraLabels, setInfraLabels] = useState<string[]>([]);
  const [coachLabels, setCoachLabels] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, a, infras, coaches] = await Promise.all([
      getStageById(id),
      getStageAutomatisation(id),
      getInfrastructures(),
      getEntraineurs(),
    ]);
    setStage(s);
    setAuto(a);
    if (s) {
      setInfraLabels(
        s.infrastructure_ids.map((iid) => infras.find((i) => i.id === iid)?.nom ?? iid)
      );
      setCoachLabels(
        s.entraineur_ids.map((cid) => {
          const c = coaches.find((x) => x.id === cid);
          return c ? `${c.prenom} ${c.nom}` : cid;
        })
      );
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSync() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await synchroniserStage(id);
      if (res.conflits > 0) {
        setMessage(`${res.conflits} conflit(s) infrastructure — corrigez avant synchronisation.`);
      } else {
        setMessage(
          `Synchronisé : ${res.reservations} réservation(s), ${res.mouvements} mouvement(s) matériel.`
        );
      }
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur de synchronisation");
    } finally {
      setSyncing(false);
    }
  }

  async function exportPdf() {
    if (!stage || !auto) return;
    await exportPdfReport(
      `fiche-stage-${stage.id}.pdf`,
      buildStageFicheReport(stage, auto, infraLabels, coachLabels)
    );
  }

  if (!stage || !auto) {
    return <p className="p-6 text-muted">Chargement…</p>;
  }

  return (
    <>
      <PageHeader title={stage.stage_action} description="Détail stage — automatisations CNE" />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <Link href="/stages">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Retour aux stages
          </Button>
        </Link>

        <div className="flex flex-wrap gap-2">
          <Badge>{stage.categorie}</Badge>
          <Badge variant="success">{stage.source}</Badge>
          <Badge>{statutStageLabel(stage.statut)}</Badge>
          {stage.id_excel && <Badge variant="muted">{stage.id_excel}</Badge>}
        </div>

        {message && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            {message}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="premium p-5">
            <h3 className="mb-3 font-semibold">Informations</h3>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Dates</dt>
                <dd className="font-medium">
                  {formatDate(stage.date_debut)} → {formatDate(stage.date_fin)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Durée</dt>
                <dd className="font-medium">{auto.duree_jours} jour(s)</dd>
              </div>
              <div>
                <dt className="text-muted">Participants</dt>
                <dd className="font-medium">
                  {stage.nombre_joueurs} joueurs · {stage.nombre_encadrants} encadrants (
                  {auto.total_participants} total)
                </dd>
              </div>
              <div>
                <dt className="text-muted">Hébergement</dt>
                <dd className="font-medium">
                  {stage.hebergement
                    ? `Oui — ${auto.chambres_requises} chambre(s) requise(s)`
                    : "Non"}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Lieu</dt>
                <dd className="font-medium">{stage.lieu ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Notes</dt>
                <dd>{stage.notes ?? "—"}</dd>
              </div>
            </dl>
          </Card>

          <Card className="premium p-5">
            <h3 className="mb-3 font-semibold">Calculs automatiques</h3>
            <ul className="space-y-2 text-sm">
              <li>
                Repas estimés : <strong>{auto.repas_estimes}</strong>
              </li>
              <li>
                Budget estimé : <strong>{auto.budget_estime.toLocaleString("fr-FR")} MAD</strong>
              </li>
              <li>
                Budget prévu / réel :{" "}
                <strong>
                  {stage.budget_prevu ?? "—"} / {stage.budget_reel ?? "—"} MAD
                </strong>
              </li>
            </ul>
            {auto.conflits.length > 0 && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                <p className="mb-1 font-medium">Conflits infrastructure</p>
                <ul className="list-disc space-y-1 pl-4">
                  {auto.conflits.map((c) => (
                    <li key={c.infrastructure_id}>{c.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="premium p-4">
            <h3 className="mb-2 font-semibold">Infrastructures</h3>
            <p className="text-sm text-muted">
              {infraLabels.length ? infraLabels.join(", ") : "Aucune affectée"}
            </p>
          </Card>
          <Card className="premium p-4">
            <h3 className="mb-2 font-semibold">Entraîneurs</h3>
            <p className="text-sm text-muted">
              {coachLabels.length ? coachLabels.join(", ") : "Aucun affecté"}
            </p>
          </Card>
          <Card className="premium p-4">
            <h3 className="mb-2 font-semibold">Matériel</h3>
            <p className="text-sm text-muted">
              {stage.materiel_assignations.length
                ? stage.materiel_assignations.map((m) => `${m.quantite} unité(s)`).join(" · ")
                : "Aucun"}
            </p>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Synchroniser planning & matériel
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              openPrintReport(buildStageFicheReport(stage, auto, infraLabels, coachLabels))
            }
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
          <Button variant="secondary" onClick={exportPdf}>
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
          <Link href="/planning">
            <Button variant="secondary">Planning</Button>
          </Link>
          <Link href="/occupation">
            <Button variant="secondary">Occupation</Button>
          </Link>
          <Link href="/hebergement">
            <Button variant="secondary">Hébergement</Button>
          </Link>
        </div>
      </main>
    </>
  );
}

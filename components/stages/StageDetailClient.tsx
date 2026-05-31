"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getStageById } from "@/lib/data/stages";
import { getStageAutomatisation } from "@/lib/data/stage-operations";
import { getInfrastructures } from "@/lib/data/infrastructures";
import { getEntraineurs } from "@/lib/data/entraineurs";
import { getJoueurs } from "@/lib/data/joueurs";
import type { StageProgramme } from "@/lib/types/stages";
import type { StageAutomatisation } from "@/lib/data/stage-operations";
import type { StageLogistiquePack } from "@/lib/types/stage-logistique";
import { formatDate } from "@/lib/utils/dates";
import { statutStageLabel } from "@/lib/utils/stage-automation";
import { buildStageFicheReport } from "@/lib/reports/stage-fiche";
import { exportPdfReport, openPrintReport } from "@/lib/export/reports";
import { getStageLogistique, provisionStageAfterCreate } from "@/lib/stages/provision-stage";
import { parseLogistiqueFromNotes, stripLogistiqueFromNotes } from "@/lib/stages/stage-logistique-serializer";
import { StageDetailSections } from "@/components/stages/StageDetailSections";
import { ArrowLeft, FileDown, Printer, RefreshCw } from "lucide-react";

type Props = { id: string };

export function StageDetailClient({ id }: Props) {
  const [stage, setStage] = useState<StageProgramme | null>(null);
  const [auto, setAuto] = useState<StageAutomatisation | null>(null);
  const [logistique, setLogistique] = useState<StageLogistiquePack | null>(null);
  const [infraLabels, setInfraLabels] = useState<string[]>([]);
  const [coachLabels, setCoachLabels] = useState<string[]>([]);
  const [joueurLabels, setJoueurLabels] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const [s, a, infras, coaches, joueurs] = await Promise.all([
      getStageById(id),
      getStageAutomatisation(id),
      getInfrastructures(),
      getEntraineurs(),
      getJoueurs(),
    ]);
    setStage(s);
    setAuto(a);
    const pack = s ? getStageLogistique(s) ?? parseLogistiqueFromNotes(s.notes) : null;
    setLogistique(pack);
    if (s) {
      setInfraLabels(
        s.infrastructure_ids.map((iid) => infras.find((i) => i.id === iid)?.nom ?? iid)
      );
      const coachIds = pack?.entraineur_ids.length ? pack.entraineur_ids : s.entraineur_ids;
      setCoachLabels(
        coachIds.map((cid) => {
          const c = coaches.find((x) => x.id === cid);
          return c ? `${c.prenom} ${c.nom}` : cid;
        })
      );
      setJoueurLabels(
        (pack?.joueur_ids ?? []).map((jid) => {
          const j = joueurs.find((x) => x.id === jid);
          return j ? `${j.prenom} ${j.nom}` : jid;
        })
      );
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSync() {
    if (!stage || !logistique) {
      setMessage("Aucune configuration logistique — recréez le stage avec le nouveau formulaire.");
      return;
    }
    setSyncing(true);
    setMessage(null);
    try {
      const res = await provisionStageAfterCreate(stage.id, logistique, { strictCourts: true });
      setMessage(
        `Synchronisé : ${res.reservations_crees} réservation(s), ${res.besoins_restauration_crees} besoin(s) restauration.`
      );
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur de synchronisation");
    } finally {
      setSyncing(false);
    }
  }

  function ficheReport() {
    if (!stage || !auto) return null;
    return buildStageFicheReport(
      stage,
      auto,
      infraLabels,
      coachLabels,
      joueurLabels,
      logistique
    );
  }

  async function exportPdf() {
    const report = ficheReport();
    if (!stage || !report) return;
    await exportPdfReport(`fiche-stage-${stage.id}.pdf`, report);
  }

  if (!stage || !auto) {
    return <p className="p-6 text-muted">Chargement…</p>;
  }

  const notesAffichables = stripLogistiqueFromNotes(stage.notes);

  return (
    <>
      <PageHeader title={stage.stage_action} description="Fiche stage — récapitulatif CNE" />
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

        <Card className="premium p-5">
          <h3 className="mb-3 font-semibold">Informations générales</h3>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Dates</dt>
              <dd className="font-medium">
                {formatDate(stage.date_debut)} → {formatDate(stage.date_fin)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Lieu</dt>
              <dd className="font-medium">{stage.lieu ?? "—"}</dd>
            </div>
            {notesAffichables && (
              <div className="sm:col-span-2">
                <dt className="text-muted">Notes</dt>
                <dd>{notesAffichables}</dd>
              </div>
            )}
          </dl>
        </Card>

        <StageDetailSections stage={stage} logistique={logistique} infraLabels={infraLabels} />

        <Card className="premium p-5">
          <h3 className="mb-3 font-semibold">Synthèse automatique</h3>
          <ul className="space-y-2 text-sm">
            <li>
              Budget estimé : <strong>{auto.budget_estime.toLocaleString("fr-FR")} MAD</strong>
            </li>
            {auto.conflits.length > 0 && (
              <li className="text-red-300">
                Conflits : {auto.conflits.map((c) => c.message).join(" · ")}
              </li>
            )}
          </ul>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSync} disabled={syncing || !logistique}>
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Synchroniser planning & services
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const r = ficheReport();
              if (r) openPrintReport(r);
            }}
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
          <Button variant="secondary" onClick={exportPdf}>
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
          <Link href="/planning">
            <Button variant="secondary">Planning</Button>
          </Link>
          <Link href="/calendrier">
            <Button variant="secondary">Calendrier</Button>
          </Link>
          <Link href="/hebergement">
            <Button variant="secondary">Hébergement</Button>
          </Link>
          <Link href="/restauration">
            <Button variant="secondary">Restauration</Button>
          </Link>
          <Link href={`/budget/previsionnels/nouveau?stage_id=${id}&type=stage`}>
            <Button variant="secondary">Créer budget lié au stage</Button>
          </Link>
        </div>
      </main>
    </>
  );
}

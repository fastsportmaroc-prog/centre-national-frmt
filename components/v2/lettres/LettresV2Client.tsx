"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/v2/ui/ToastProvider";
import {
  deleteLettreAction,
  generateLettreForStageAction,
  getStagesLettresOverviewAction,
  listLettresAction,
  regenerateLettreFilesAction,
} from "@/lib/actions/lettre-actions";
import type { StageLettreOverview } from "@/lib/letters/letter-types";
import { buildLetterContent } from "@/lib/letters/letter-content";
import {
  deleteLettreLocal,
  downloadBase64File,
  loadLettresLocal,
  mergeRemoteAndLocalLettres,
  saveLettreLocal,
} from "@/lib/letters/lettres-storage";
import type { LettreOfficielleRecord, LettreType } from "@/lib/letters/letter-types";
import { FileText, Mail, RefreshCw } from "lucide-react";

const TYPE_LABELS: Record<LettreType, string> = {
  reservation: "Réservation hébergement + terrains",
  terrains_only: "Terrains uniquement",
  liste_participants: "Liste participants",
  libre: "Lettre libre",
};

export function LettresV2Client() {
  const { toast } = useToast();
  const [stages, setStages] = useState<StageLettreOverview[]>([]);
  const [lettres, setLettres] = useState<LettreOfficielleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [modalStage, setModalStage] = useState<StageLettreOverview | null>(null);
  const [club, setClub] = useState("Club de l'Agriculture Rabat");
  const [lieuEnvoi, setLieuEnvoi] = useState("Rabat");
  const [type, setType] = useState<LettreType>("reservation");
  const [filter, setFilter] = useState<"all" | "sans_lettre" | "avec_lettre">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [overview, remote] = await Promise.all([
      getStagesLettresOverviewAction(),
      listLettresAction(),
    ]);
    const local = loadLettresLocal();
    const allLettres = mergeRemoteAndLocalLettres(remote, local);

    const localByStage = new Map(local.map((l) => [l.stage_id, l]));
    const merged = overview.map((s) => {
      const loc = localByStage.get(s.id);
      if (loc && !s.lettre_id) {
        return { ...s, lettre_id: loc.id, lettre_date: loc.date_lettre };
      }
      return s;
    });

    setStages(merged);
    setLettres(allLettres);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredStages = useMemo(() => {
    if (filter === "sans_lettre") return stages.filter((s) => !s.lettre_id);
    if (filter === "avec_lettre") return stages.filter((s) => !!s.lettre_id);
    return stages;
  }, [stages, filter]);

  const sansLettre = stages.filter((s) => !s.lettre_id).length;

  const previewText = useMemo(() => {
    if (!modalStage) return "";
    const c = buildLetterContent({
      stage: {
        id: modalStage.id,
        stage_action: modalStage.stage_action,
        date_debut: modalStage.date_debut,
        date_fin: modalStage.date_fin,
        lieu: modalStage.lieu,
        categorie: modalStage.categorie,
      },
      joueurs: [],
      coachs: [],
      hebergement: modalStage.hebergement ? { stage_id: modalStage.id } as never : null,
      clubDestinataire: club,
      dateLettre: `${lieuEnvoi}, le ${new Date().toLocaleDateString("fr-FR")}`,
      type,
      nbCourts: 2,
    });
    return c.objet;
  }, [modalStage, club, lieuEnvoi, type]);

  function openModal(stage: StageLettreOverview) {
    setModalStage(stage);
    setClub(stage.club_default);
    setLieuEnvoi("Rabat");
    setType(
      !stage.hebergement && stage.terrains ? "terrains_only" : "reservation"
    );
  }

  async function handleGenerate(stage: StageLettreOverview, fromModal = false) {
    setGeneratingId(stage.id);
    const res = await generateLettreForStageAction({
      stage_id: stage.id,
      club_destinataire: fromModal ? club : stage.club_default,
      lieu_envoi: fromModal ? lieuEnvoi : "Rabat",
      type: fromModal ? type : undefined,
    });
    setGeneratingId(null);
    if (!res.ok || !res.record) {
      toast(res.error ?? "Échec génération", "error");
      return;
    }
    saveLettreLocal(res.record);
    toast(`Lettre générée — ${stage.stage_action}`);
    setModalStage(null);
    await load();
  }

  function findLettre(stageId: string): LettreOfficielleRecord | undefined {
    return lettres.find((l) => l.stage_id === stageId);
  }

  async function downloadPdf(stageId: string) {
    const row = findLettre(stageId);
    if (!row) {
      toast("Générez d'abord la lettre", "error");
      return;
    }
    if (row.pdf_base64) {
      downloadBase64File(row.pdf_base64, "application/pdf", `${row.stage_nom ?? "lettre"}.pdf`);
      return;
    }
    if (row.input_snapshot) {
      const regen = await regenerateLettreFilesAction(row.input_snapshot);
      downloadBase64File(regen.pdfBase64, "application/pdf", `${regen.filenameBase}.pdf`);
    }
  }

  async function downloadDocx(stageId: string) {
    const row = findLettre(stageId);
    if (!row) {
      toast("Générez d'abord la lettre", "error");
      return;
    }
    if (row.docx_base64) {
      downloadBase64File(
        row.docx_base64,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        `${row.stage_nom ?? "lettre"}.docx`
      );
      return;
    }
    if (row.input_snapshot) {
      const regen = await regenerateLettreFilesAction(row.input_snapshot);
      downloadBase64File(
        regen.docxBase64,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        `${regen.filenameBase}.docx`
      );
    }
  }

  async function handleDeleteLettre(stageId: string, lettreId: string) {
    if (!confirm("Supprimer cette lettre ?")) return;
    await deleteLettreAction(lettreId);
    deleteLettreLocal(lettreId);
    toast("Lettre supprimée");
    await load();
  }

  return (
    <>
      <V2PageHeader
        title="Lettres officielles"
        description="Générer les lettres FRMT à partir des stages déjà saisis"
        actions={
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        }
      />

      <main className="space-y-6 p-4 sm:p-6">
        <Card className="border-frmt-green/30 bg-frmt-green/5 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Mail className="h-8 w-8 text-frmt-green" />
            <div className="flex-1">
              <p className="font-semibold">Stages déjà saisis</p>
              <p className="text-sm text-muted">
                {stages.length} stage(s) en base — {sansLettre} sans lettre officielle
              </p>
            </div>
            {sansLettre > 0 && (
              <Button size="sm" onClick={() => setFilter("sans_lettre")}>
                Voir les {sansLettre} sans lettre
              </Button>
            )}
          </div>
        </Card>

        <Card className="flex flex-wrap items-center gap-2 p-3">
          <span className="text-xs text-muted">Onglets demande lettre :</span>
          {(
            [
              ["all", "Tous les stages"],
              ["sans_lettre", "Sans lettre"],
              ["avec_lettre", "Avec lettre"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded px-3 py-1.5 text-xs ${
                filter === id ? "bg-frmt-green text-white" : "border border-border text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </Card>

        <Card className="overflow-x-auto p-0">
          {loading ? (
            <p className="p-8 text-center text-muted">Chargement des stages…</p>
          ) : (
            <table className="v2-data-table w-full text-sm">
              <thead>
                <tr>
                  <th className="p-3">Stage</th>
                  <th className="p-3">Dates</th>
                  <th className="p-3">Lieu / Club</th>
                  <th className="p-3">Participants</th>
                  <th className="p-3">Héb. / Terrains</th>
                  <th className="p-3">Lettre</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStages.map((s) => (
                  <tr key={s.id} className="border-b border-border/40">
                    <td className="p-3 font-medium">{s.stage_action}</td>
                    <td className="p-3 text-muted">
                      {s.date_debut} → {s.date_fin}
                    </td>
                    <td className="p-3">{s.lieu ?? s.club_default}</td>
                    <td className="p-3">
                      {s.nb_joueurs} joueur(s) · {s.nb_coachs} coach(s)
                    </td>
                    <td className="p-3">
                      {s.hebergement && <Badge variant="success">Hébergement</Badge>}{" "}
                      {s.terrains && <Badge variant="muted">Terrains</Badge>}
                    </td>
                    <td className="p-3">
                      {s.lettre_id ? (
                        <Badge variant="success">Générée{s.lettre_date ? ` · ${s.lettre_date}` : ""}</Badge>
                      ) : (
                        <Badge variant="warning">À générer</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {!s.lettre_id ? (
                          <>
                            <Button
                              size="sm"
                              disabled={generatingId === s.id}
                              onClick={() => void handleGenerate(s)}
                            >
                              {generatingId === s.id ? "…" : "Générer"}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => openModal(s)}>
                              Personnaliser
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => void downloadPdf(s.id)}>
                              <FileText className="h-3 w-3" />
                              PDF
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => void downloadDocx(s.id)}>
                              Word
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openModal(s)}>
                              Régénérer
                            </Button>
                            {s.lettre_id && (
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => void handleDeleteLettre(s.id, s.lettre_id!)}
                              >
                                Suppr.
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStages.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted">
                      Aucun stage pour ce filtre.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </Card>

        {lettres.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Historique des lettres
            </h2>
            <Card className="overflow-x-auto p-0">
            <table className="v2-data-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-3">Stage</th>
                    <th className="p-3">Club</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Télécharger</th>
                  </tr>
                </thead>
                <tbody>
                  {lettres.map((row) => (
                    <tr key={row.id} className="border-b border-border/40">
                      <td className="p-3">{row.stage_nom ?? "—"}</td>
                      <td className="p-3">{row.club_destinataire}</td>
                      <td className="p-3">{row.date_lettre}</td>
                      <td className="p-3">{TYPE_LABELS[row.type] ?? row.type}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void downloadPdf(row.stage_id)}
                          >
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void downloadDocx(row.stage_id)}
                          >
                            Word
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </section>
        )}
      </main>

      <Modal
        open={!!modalStage}
        onClose={() => setModalStage(null)}
        title={modalStage ? `Lettre — ${modalStage.stage_action}` : "Lettre"}
        panelClassName="max-w-lg"
      >
        {modalStage && (
          <div className="space-y-3">
            <p className="rounded-lg bg-surface-elevated p-2 text-xs text-muted">
              Stage : {modalStage.date_debut} → {modalStage.date_fin} · {modalStage.nb_joueurs}{" "}
              joueurs · {modalStage.nb_coachs} coachs
            </p>
            <div>
              <Label>Club destinataire</Label>
              <Input value={club} onChange={(e) => setClub(e.target.value)} />
            </div>
            <div>
              <Label>Lieu d&apos;envoi</Label>
              <Input value={lieuEnvoi} onChange={(e) => setLieuEnvoi(e.target.value)} />
            </div>
            <div>
              <Label>Type de lettre</Label>
              <Select value={type} onChange={(e) => setType(e.target.value as LettreType)}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>
            <p className="text-xs text-muted">
              Aperçu objet : <span className="text-foreground">{previewText}</span>
            </p>
            <Button
              disabled={generatingId === modalStage.id}
              onClick={() => void handleGenerate(modalStage, true)}
            >
              {generatingId === modalStage.id ? "Génération…" : "Générer PDF + Word"}
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}

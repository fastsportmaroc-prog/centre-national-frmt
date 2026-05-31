"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { generateLettreForStageAction } from "@/lib/actions/lettre-actions";
import { buildLetterContent } from "@/lib/letters/letter-content";
import {
  parseParticipantsDatesPayload,
  participantDatesToLettreExceptions,
} from "@/lib/hebergement/participants-dates";
import { deriveLettreHebergementBesoins } from "@/lib/letters/letter-stage-data";
import {
  downloadBase64File,
  saveLettreLocal,
} from "@/lib/letters/lettres-storage";
import type {
  LettreDemandeType,
  LettreHebergementBesoins,
  LettreHebergementException,
  LettreOfficielleRecord,
} from "@/lib/letters/letter-types";
import type {
  EntraineurV2,
  HebergementStageV2,
  JoueurV2,
  StageProgrammeV2,
} from "@/lib/types/v2";
import { FileText } from "lucide-react";

const DEFAULT_CLUB = "Club de l'Agriculture Rabat";

type Props = {
  open: boolean;
  onClose: () => void;
  stage: StageProgrammeV2;
  joueurs: JoueurV2[];
  coachs: EntraineurV2[];
  hebergement: HebergementStageV2 | null;
  initialRecord?: LettreOfficielleRecord | null;
  onGenerated?: () => void;
};

export function StageLettreModal({
  open,
  onClose,
  stage,
  joueurs,
  coachs,
  hebergement,
  initialRecord,
  onGenerated,
}: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [lastRecord, setLastRecord] = useState<LettreOfficielleRecord | null>(null);
  const [licenceRecapB64, setLicenceRecapB64] = useState<string | null>(null);

  const [club, setClub] = useState(DEFAULT_CLUB);
  const [lieuEnvoi, setLieuEnvoi] = useState("Rabat");
  const [demandeType, setDemandeType] = useState<LettreDemandeType>("avec_hebergement");
  const [notes, setNotes] = useState("");
  const [besoins, setBesoins] = useState("");
  const [chambres, setChambres] = useState<LettreHebergementBesoins>({});
  const [nuiteesDebut, setNuiteesDebut] = useState("");
  const [nuiteesFin, setNuiteesFin] = useState("");
  const [exceptions, setExceptions] = useState<LettreHebergementException[]>([]);

  useEffect(() => {
    if (!open) return;
    const buildAutoBesoins = () => {
      const parts: string[] = [];
      if (hebergement) {
        parts.push(
          `Hébergement: joueurs=${hebergement.nb_chambres_joueurs ?? 0}, staff=${hebergement.nb_chambres_coachs ?? 0}${
            hebergement.kitchenette ? ", kitchenette=oui" : ""
          }.`
        );
      }
      return parts.join(" ");
    };
    setClub(initialRecord?.club_destinataire || stage.lieu?.trim() || DEFAULT_CLUB);
    setDemandeType(
      initialRecord?.avec_hebergement || initialRecord?.type === "reservation"
        ? "avec_hebergement"
        : stage.hebergement || hebergement
          ? "avec_hebergement"
          : "sans_hebergement"
    );
    setChambres(deriveLettreHebergementBesoins(hebergement, joueurs, coachs));
    setNuiteesDebut(
      (hebergement?.date_debut ?? stage.date_debut).toString().slice(0, 10)
    );
    setNuiteesFin((hebergement?.date_fin ?? stage.date_fin).toString().slice(0, 10));
    const defaultDebut = hebergement?.date_debut ?? stage.date_debut;
    const defaultFin = hebergement?.date_fin ?? stage.date_fin;
    const datesPayload = parseParticipantsDatesPayload(hebergement);
    const fromHeb = datesPayload.actif
      ? participantDatesToLettreExceptions(datesPayload.rows, defaultDebut, defaultFin)
      : [];
    setExceptions(
      initialRecord?.exceptions_hebergement?.length
        ? initialRecord.exceptions_hebergement
        : fromHeb
    );
    setBesoins(buildAutoBesoins());
    setNotes(initialRecord?.contenu_personnalise ?? hebergement?.remarques ?? "");
    setLastRecord(null);
    setLicenceRecapB64(null);
  }, [open, stage, hebergement, initialRecord, joueurs, coachs, hebergement?.date_debut, hebergement?.date_fin]);

  const dateLettre = `${lieuEnvoi}, le ${format(new Date(), "d MMMM yyyy", { locale: fr })}`;
  const stageDates = `${format(new Date(stage.date_debut), "d MMMM yyyy", { locale: fr })} au ${format(new Date(stage.date_fin), "d MMMM yyyy", { locale: fr })}`;

  const previewContent = useMemo(() => {
    return buildLetterContent({
      stage,
      joueurs,
      coachs,
      hebergement,
      clubDestinataire: club,
      dateLettre,
      type: demandeType === "avec_hebergement" ? "reservation" : "liste_participants",
      exceptions,
      notes,
      besoinsSpecifiques: besoins,
      hebergementBesoins:
        demandeType === "avec_hebergement"
          ? deriveLettreHebergementBesoins(hebergement, joueurs, coachs, chambres)
          : undefined,
      nuiteesDateDebut: nuiteesDebut,
      nuiteesDateFin: nuiteesFin,
      nbCourts: 2,
    });
  }, [
    stage,
    joueurs,
    coachs,
    hebergement,
    club,
    dateLettre,
    demandeType,
    exceptions,
    notes,
    besoins,
    chambres,
    nuiteesDebut,
    nuiteesFin,
  ]);

  const generatingRef = useRef(false);

  async function handleGenerate() {
    if (generatingRef.current || saving) return;
    generatingRef.current = true;
    setSaving(true);
    try {
    const res = await generateLettreForStageAction({
      stage_id: stage.id,
      club_destinataire: club,
      lieu_envoi: lieuEnvoi,
      demande_type: demandeType,
      exceptions,
      notes,
      besoins_specifiques: besoins,
      hebergement_besoins:
        demandeType === "avec_hebergement"
          ? deriveLettreHebergementBesoins(hebergement, joueurs, coachs, chambres)
          : undefined,
      nuitees_date_debut: nuiteesDebut || undefined,
      nuitees_date_fin: nuiteesFin || undefined,
    });

    if (!res.ok || !res.record) {
      toast(res.error ?? "Échec de génération", "error");
      return;
    }

    saveLettreLocal(res.record);
    setLastRecord(res.record);
    setLicenceRecapB64(
      "licence_recap_base64" in res ? (res.licence_recap_base64 as string) : null
    );

    toast("Lettre officielle générée", "success");

    onGenerated?.();
    onClose();
    } finally {
      setSaving(false);
      generatingRef.current = false;
    }
  }

  function downloadPdf() {
    if (!lastRecord?.pdf_base64) return;
    const name =
      lastRecord.pdf_filename ??
      `Lettre_officielle_stage_${stage.stage_action}_${stage.date_debut}.pdf`;
    downloadBase64File(lastRecord.pdf_base64, "application/pdf", name);
  }

  function downloadDocx() {
    if (!lastRecord?.docx_base64) return;
    const name = pdfName.replace(/\.pdf$/i, ".docx");
    downloadBase64File(
      lastRecord.docx_base64,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      name
    );
  }

  function downloadLicencesRecap() {
    const b64 = licenceRecapB64;
    if (!b64) return;
    downloadBase64File(
      b64,
      "text/plain;charset=utf-8",
      `Licences_${stage.stage_action.slice(0, 30)}.txt`
    );
  }

  const pdfName =
    lastRecord?.pdf_filename ??
    `Lettre_officielle_stage_${stage.stage_action}_${stage.date_debut}.pdf`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Générer lettre officielle"
      panelClassName="max-w-2xl max-h-[90vh] overflow-y-auto"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={() => void handleGenerate()} disabled={saving}>
            {saving ? "Génération…" : "Générer PDF + Word"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-border bg-surface-elevated/50 p-3">
          <p className="font-medium">{stage.stage_action}</p>
          <p className="text-muted">{stageDates}</p>
          <p className="mt-1 text-xs">
            {joueurs.length} joueur(s) · {coachs.length} entraîneur(s) / staff
          </p>
        </div>

        <div className="rounded-lg border border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-muted">Demande lettre</p>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDemandeType("avec_hebergement")}
              className={`rounded px-3 py-1 text-xs ${
                demandeType === "avec_hebergement"
                  ? "bg-frmt-green text-white"
                  : "border border-border text-muted"
              }`}
            >
              Avec hébergement
            </button>
            <button
              type="button"
              onClick={() => setDemandeType("sans_hebergement")}
              className={`rounded px-3 py-1 text-xs ${
                demandeType === "sans_hebergement"
                  ? "bg-frmt-green text-white"
                  : "border border-border text-muted"
              }`}
            >
              Liste participants
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Destinataire</Label>
            <Input value={club} onChange={(e) => setClub(e.target.value)} />
          </div>
          <div>
            <Label>Lieu d&apos;envoi</Label>
            <Input value={lieuEnvoi} onChange={(e) => setLieuEnvoi(e.target.value)} />
          </div>
          <div>
            <Label>Type de demande</Label>
            <Select
              value={demandeType}
              onChange={(e) => setDemandeType(e.target.value as LettreDemandeType)}
            >
              <option value="avec_hebergement">Avec hébergement</option>
              <option value="sans_hebergement">Liste participants (sans hébergement complet)</option>
            </Select>
          </div>
        </div>
        </div>

        {demandeType === "avec_hebergement" && (
          <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
            <p className="sm:col-span-2 text-xs font-semibold uppercase text-muted">
              Besoins hébergement
            </p>
            <div>
              <Label>Chambres garçons</Label>
              <Input
                type="number"
                min={0}
                value={chambres.chambres_garcons ?? ""}
                onChange={(e) =>
                  setChambres({
                    ...chambres,
                    chambres_garcons: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div>
              <Label>Chambres filles</Label>
              <Input
                type="number"
                min={0}
                value={chambres.chambres_filles ?? ""}
                onChange={(e) =>
                  setChambres({
                    ...chambres,
                    chambres_filles: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div>
              <Label>Chambres staff</Label>
              <Input
                type="number"
                min={0}
                value={chambres.chambres_staff ?? ""}
                onChange={(e) =>
                  setChambres({
                    ...chambres,
                    chambres_staff: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div>
              <Label>Chambres individuelles</Label>
              <Input
                type="number"
                min={0}
                value={chambres.chambre_individuelle ?? ""}
                onChange={(e) =>
                  setChambres({
                    ...chambres,
                    chambre_individuelle: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div>
              <Label>Chambres kitchenette</Label>
              <Input
                type="number"
                min={0}
                value={chambres.chambre_kitchenette ?? ""}
                onChange={(e) =>
                  setChambres({
                    ...chambres,
                    chambre_kitchenette: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>
        )}

        <div>
          <Label>Notes optionnelles</Label>
          <textarea
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div>
          <Label>Besoins spécifiques</Label>
          <textarea
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            rows={2}
            value={besoins}
            onChange={(e) => setBesoins(e.target.value)}
            placeholder="Précisions pour le club…"
          />
        </div>

        {hebergement && parseParticipantsDatesPayload(hebergement).actif && (
          <p className="text-xs text-muted">
            Les dates par participant (onglet Hébergement) sont reprises automatiquement à la
            génération.
          </p>
        )}

        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer font-medium">
            Ajuster dates / kitchenette ({exceptions.length})
          </summary>
          <div className="mt-3 space-y-2">
            {[...joueurs, ...coachs].map((p) => {
              const type = joueurs.some((j) => j.id === p.id) ? "joueur" : "entraineur";
              const ex = exceptions.find(
                (x) => x.personne_id === p.id && x.personne_type === type
              );
              return (
                <div
                  key={`${type}-${p.id}`}
                  className="grid gap-2 rounded border border-border/50 p-2 sm:grid-cols-4"
                >
                  <span className="text-xs sm:col-span-4">
                    {p.prenom} {p.nom} ({type === "joueur" ? "Joueur" : "Staff"})
                  </span>
                  <Input
                    type="date"
                    placeholder="Arrivée"
                    value={ex?.date_debut ?? ""}
                    onChange={(e) => {
                      const next = exceptions.filter(
                        (x) => !(x.personne_id === p.id && x.personne_type === type)
                      );
                      if (e.target.value || ex?.date_fin || ex?.kitchenette) {
                        next.push({
                          personne_id: p.id,
                          personne_type: type,
                          date_debut: e.target.value || undefined,
                          date_fin: ex?.date_fin,
                          kitchenette: ex?.kitchenette,
                          note: ex?.note,
                        });
                      }
                      setExceptions(next);
                    }}
                  />
                  <Input
                    type="date"
                    placeholder="Départ"
                    value={ex?.date_fin ?? ""}
                    onChange={(e) => {
                      const next = exceptions.filter(
                        (x) => !(x.personne_id === p.id && x.personne_type === type)
                      );
                      if (e.target.value || ex?.date_debut || ex?.kitchenette) {
                        next.push({
                          personne_id: p.id,
                          personne_type: type,
                          date_debut: ex?.date_debut,
                          date_fin: e.target.value || undefined,
                          kitchenette: ex?.kitchenette,
                          note: ex?.note,
                        });
                      }
                      setExceptions(next);
                    }}
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={!!ex?.kitchenette}
                      onChange={(e) => {
                        const next = exceptions.filter(
                          (x) => !(x.personne_id === p.id && x.personne_type === type)
                        );
                        if (e.target.checked || ex?.date_debut || ex?.date_fin) {
                          next.push({
                            personne_id: p.id,
                            personne_type: type,
                            date_debut: ex?.date_debut,
                            date_fin: ex?.date_fin,
                            kitchenette: e.target.checked,
                            note: ex?.note,
                          });
                        }
                        setExceptions(next);
                      }}
                    />
                    Kitchenette
                  </label>
                </div>
              );
            })}
          </div>
        </details>

        <div className="rounded-lg border border-border bg-surface-elevated/40 p-3 text-xs">
          <p className="font-semibold text-foreground">Participants (onglet Participants)</p>
          {joueurs.length === 0 && coachs.length === 0 ? (
            <p className="mt-1 text-muted">
              Aucun joueur ni coach affecté au stage — ajoutez-les dans l’onglet Participants avant de
              générer.
            </p>
          ) : (
            <ul className="mt-2 max-h-28 space-y-0.5 overflow-y-auto text-muted">
              {joueurs.map((j) => (
                <li key={j.id}>
                  — {j.nom.toUpperCase()} {j.prenom}
                </li>
              ))}
              {coachs.map((c) => (
                <li key={c.id}>
                  — {c.nom.toUpperCase()} {c.prenom} (staff)
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
          <p className="sm:col-span-2 text-xs font-semibold uppercase text-muted">
            Nuitées (onglet Hébergement ou saisie manuelle)
          </p>
          <div>
            <Label>Date début nuitées</Label>
            <Input
              type="date"
              value={nuiteesDebut}
              onChange={(e) => setNuiteesDebut(e.target.value)}
            />
          </div>
          <div>
            <Label>Date fin nuitées</Label>
            <Input
              type="date"
              value={nuiteesFin}
              onChange={(e) => setNuiteesFin(e.target.value)}
            />
          </div>
        </div>

        <p className="text-xs text-muted">
          Objet : <span className="text-foreground">{previewContent.objet}</span>
        </p>

        {lastRecord && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            <Button variant="secondary" size="sm" onClick={downloadPdf}>
              <FileText className="h-4 w-4" />
              {pdfName}
            </Button>
            <Button variant="secondary" size="sm" onClick={downloadDocx}>
              Word
            </Button>
            {licenceRecapB64 && (
              <Button variant="ghost" size="sm" onClick={downloadLicencesRecap}>
                Récap. licences (.txt)
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

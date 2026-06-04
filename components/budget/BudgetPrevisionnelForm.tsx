"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { BudgetPrevisionnelLignesTable } from "@/components/budget/BudgetPrevisionnelLignesTable";
import { defaultBudgetLigneValues } from "@/lib/constants/budget-ligne-saisie";
import { BudgetMembresExtraSection } from "@/components/budget/BudgetMembresExtraSection";
import { BudgetParticipantsSection } from "@/components/budget/BudgetParticipantsSection";
import {
  budgetMembreExtraBadgeLabel,
} from "@/lib/constants/budget-membres";
import {
  BUDGET_LIGNE_CATEGORIES,
  LIGNES_BUDGET_PRESETS,
  STATUTS_BUDGET,
  TAUX_MAD_DEFAUT,
  TAUX_MAD_STORAGE_KEY,
  TYPES_BUDGET,
} from "@/lib/constants/budget-previsionnel";
import { openBudgetPrevisionnelPdf } from "@/lib/reports/budget-previsionnel-report";
import type {
  BudgetMembreExtra,
  BudgetPrevisionnel,
  BudgetPrevisionnelInput,
  BudgetPrevisionnelLine,
} from "@/lib/types/budget-previsionnel";
import {
  computeBudgetTotals,
  computeLignesWithTotals,
  formatEur,
  formatMad,
} from "@/lib/utils/budget-previsionnel-math";
import { newLocalId } from "@/lib/local-test/storage";
import { Plus } from "lucide-react";

export type BudgetPrevisionnelFormProps = {
  initial?: BudgetPrevisionnel | null;
  defaultJoueurId?: string;
  defaultStageId?: string;
  defaultSujet?: string;
  defaultTournoi?: string;
  defaultDateDebut?: string;
  defaultDateFin?: string;
  defaultPays?: string;
  defaultVille?: string;
  defaultType?: BudgetPrevisionnelInput["type_budget"];
  /** Choix Mission / Tournoi + une seule case libellé (budget voyage compétition). */
  contexteMissionTournoi?: boolean;
  joueurs: { id: string; label: string; subtitle?: string }[];
  entraineurs: { id: string; label: string; subtitle?: string }[];
  groupes?: { id: string; label: string }[];
  onSubmit: (input: BudgetPrevisionnelInput) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
};

function emptyLine(): Omit<BudgetPrevisionnelLine, "total_eur"> {
  return {
    id: newLocalId(),
    designation: BUDGET_LIGNE_CATEGORIES[0],
    description: "",
    quantite: 1,
    jours_nuits: 1,
    prix_unitaire_eur: 0,
    remarques: null,
    ordre: 0,
  };
}

export function BudgetPrevisionnelForm({
  initial,
  defaultJoueurId,
  defaultStageId,
  defaultSujet,
  defaultTournoi,
  defaultDateDebut,
  defaultDateFin,
  defaultPays,
  defaultVille,
  defaultType,
  contexteMissionTournoi = false,
  joueurs,
  entraineurs,
  groupes = [],
  onSubmit,
  onCancel,
  submitLabel = "Créer le budget",
}: BudgetPrevisionnelFormProps) {
  const [devise, setDevise] = useState<"EUR" | "MAD">(
    (initial?.devise as "EUR" | "MAD") ?? "EUR"
  );
  const [tauxMad, setTauxMad] = useState(initial?.taux_mad ?? TAUX_MAD_DEFAUT);
  const [participantMode, setParticipantMode] = useState<"individual" | "group">("individual");
  const [joueurIds, setJoueurIds] = useState<string[]>(() => {
    if (initial?.participants?.joueur_ids?.length) return initial.participants.joueur_ids;
    if (initial?.joueur_id) return [initial.joueur_id];
    return defaultJoueurId ? [defaultJoueurId] : [];
  });
  const [coachIds, setCoachIds] = useState<string[]>(() => {
    if (initial?.participants?.coach_ids?.length) return initial.participants.coach_ids;
    if (initial?.entraineur_id) return [initial.entraineur_id];
    return [];
  });
  const [groupeId, setGroupeId] = useState("");
  const [equipeLibre, setEquipeLibre] = useState(initial?.equipe_libelle ?? "");
  const [membresExtras, setMembresExtras] = useState<BudgetMembreExtra[]>(
    () => initial?.participants?.membres_extras ?? []
  );

  const [objet, setObjet] = useState(initial?.objet ?? "");
  const [typeBudget, setTypeBudget] = useState(
    initial?.type_budget ?? defaultType ?? "mission"
  );
  const [tournoi, setTournoi] = useState(initial?.tournoi_evenement ?? defaultTournoi ?? "");
  const [contexteKind, setContexteKind] = useState<"mission" | "tournoi">(() => {
    const t = initial?.type_budget ?? defaultType ?? "tournoi";
    return t === "mission" ? "mission" : "tournoi";
  });
  const [contexteLibelle, setContexteLibelle] = useState(
    () => initial?.tournoi_evenement ?? defaultTournoi ?? ""
  );
  const [pays, setPays] = useState(initial?.pays ?? defaultPays ?? "");
  const [ville, setVille] = useState(initial?.ville ?? defaultVille ?? "");
  const [dateDebut, setDateDebut] = useState(
    initial?.date_debut ?? defaultDateDebut ?? new Date().toISOString().slice(0, 10)
  );
  const [dateFin, setDateFin] = useState(
    initial?.date_fin ?? defaultDateFin ?? new Date().toISOString().slice(0, 10)
  );
  const [statut, setStatut] = useState(initial?.statut ?? "brouillon");
  const [stageId] = useState<string | null>(initial?.stage_id ?? defaultStageId ?? null);
  const [lignes, setLignes] = useState<Omit<BudgetPrevisionnelLine, "total_eur">[]>(() => {
    const source = initial?.lignes?.length
      ? [...initial.lignes].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
      : null;
    return (
      source?.map((l) => ({
        id: l.id,
        designation: l.designation,
        description: l.description,
        quantite: l.quantite,
        jours_nuits: l.jours_nuits ?? 1,
        prix_unitaire_eur: l.prix_unitaire_eur,
        remarques: l.remarques,
        ordre: l.ordre,
      })) ?? [emptyLine()]
    );
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(TAUX_MAD_STORAGE_KEY);
    if (saved && !initial?.taux_mad) setTauxMad(Number(saved) || TAUX_MAD_DEFAUT);
  }, [initial?.taux_mad]);

  useEffect(() => {
    if (devise === "EUR" && typeof window !== "undefined") {
      localStorage.setItem(TAUX_MAD_STORAGE_KEY, String(tauxMad));
    }
  }, [tauxMad, devise]);

  const computed = useMemo(() => {
    const withTotals = computeLignesWithTotals(lignes);
    return computeBudgetTotals(withTotals, tauxMad, devise);
  }, [lignes, tauxMad, devise]);

  const autresMembresCount = useMemo(
    () => membresExtras.filter((m) => m.type === "kine" || m.type === "federal").length,
    [membresExtras]
  );

  const totalParticipants = useMemo(() => {
    const base = joueurIds.length + coachIds.length;
    if (participantMode === "group") {
      return base + autresMembresCount;
    }
    return base;
  }, [participantMode, joueurIds, coachIds, autresMembresCount]);

  function updateLigne(idx: number, patch: Partial<BudgetPrevisionnelLine>) {
    setLignes((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function buildInput(targetStatut: typeof statut): BudgetPrevisionnelInput {
    let sujetLibelle = "";
    let joueurId: string | null = null;
    let entraineurId: string | null = null;
    let equipe = equipeLibre.trim() || null;
    let nbPersonnes = totalParticipants || 1;
    let avecCoach = coachIds.length > 0;
    let coachNom: string | null = null;

    const jLabels = joueurs.filter((j) => joueurIds.includes(j.id)).map((j) => j.label);
    const cLabels = entraineurs.filter((c) => coachIds.includes(c.id)).map((c) => c.label);
    const extraLabels = membresExtras
      .filter((m) => m.type === "kine" || m.type === "federal")
      .map((m) => budgetMembreExtraBadgeLabel(m));

    joueurId = joueurIds[0] ?? null;
    entraineurId = coachIds[0] ?? null;
    coachNom = cLabels.length > 0 ? cLabels.join(", ") : null;
    avecCoach = coachIds.length > 0;
    nbPersonnes = Math.max(1, totalParticipants);

    if (participantMode === "individual") {
      sujetLibelle = [...jLabels, ...cLabels].join(", ") || defaultSujet || "Participants";
    } else {
      const g = groupes.find((x) => x.id === groupeId);
      const equipeNom = equipeLibre.trim() || g?.label || "Équipe";
      equipe = equipeNom;
      const personnes = [...jLabels, ...cLabels, ...extraLabels].join(", ");
      sujetLibelle = personnes ? `${equipeNom} — ${personnes}` : equipeNom;
    }

    return {
      objet: objet.trim(),
      type_budget: contexteMissionTournoi ? contexteKind : typeBudget,
      sujet_libelle: sujetLibelle,
      avec_coach: avecCoach,
      coach_nom: coachNom,
      tournoi_evenement: contexteMissionTournoi
        ? contexteLibelle.trim() || null
        : tournoi.trim() || null,
      pays: pays.trim() || null,
      ville: ville.trim() || null,
      date_debut: dateDebut,
      date_fin: dateFin,
      nombre_personnes: nbPersonnes,
      devise,
      taux_mad: devise === "EUR" ? tauxMad : TAUX_MAD_DEFAUT,
      statut: targetStatut,
      joueur_id: joueurId,
      entraineur_id: entraineurId,
      participants: {
        joueur_ids: joueurIds,
        coach_ids: coachIds,
        membres_extras:
          participantMode === "group"
            ? membresExtras.filter((m) => m.type === "kine" || m.type === "federal")
            : [],
      },
      stage_id: stageId,
      equipe_libelle: equipe,
      lignes: lignes.map((l, i) => ({
        designation: l.designation,
        description: l.description,
        quantite: l.quantite,
        jours_nuits: l.jours_nuits ?? 1,
        prix_unitaire_eur: l.prix_unitaire_eur,
        remarques: l.remarques,
        ordre: i,
      })),
    };
  }

  function buildPreviewBudget(): BudgetPrevisionnel {
    const input = buildInput(statut);
    const withTotals = computeLignesWithTotals(input.lignes);
    return {
      id: initial?.id ?? "preview",
      ...input,
      lignes: withTotals,
      signataires: initial?.signataires ?? [],
      sous_total_eur: computed.sous_total_eur,
      total_eur: computed.total_eur,
      total_mad: computed.total_mad,
      montant_lettres_mad: computed.montant_lettres_mad,
      dernier_export_pdf_at: null,
      created_by: "preview",
      updated_by: "preview",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async function handleSubmit(e: React.FormEvent, targetStatut: typeof statut) {
    e.preventDefault();
    setError(null);
    if (!objet.trim()) {
      setError("L'objet est obligatoire.");
      return;
    }
    if (devise === "EUR" && (!tauxMad || tauxMad <= 0)) {
      setError("Le taux EUR/MAD est obligatoire.");
      return;
    }
    if (lignes.some((l) => !l.designation.trim())) {
      setError("Chaque ligne doit avoir une catégorie ou un libellé.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(buildInput(targetStatut));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  const prixLabel = devise === "EUR" ? "Prix (EUR)" : "Prix (MAD)";

  return (
    <>
      <form onSubmit={(e) => void handleSubmit(e, "valide")} className="space-y-6">
        <Card premium className="space-y-4 p-4">
          <h2 className="text-sm font-semibold text-tennis">Devise de travail</h2>
          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                checked={devise === "MAD"}
                onChange={() => setDevise("MAD")}
              />
              Dirhams (MAD)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                checked={devise === "EUR"}
                onChange={() => setDevise("EUR")}
              />
              Euros (EUR) — convertible en MAD
            </label>
          </div>
        </Card>

        <Card premium className="space-y-4 p-4">
          <h2 className="text-sm font-semibold text-tennis">Participants concernés</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={participantMode === "individual"}
                onChange={() => setParticipantMode("individual")}
              />
              Joueurs / Coachs individuels
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={participantMode === "group"}
                onChange={() => setParticipantMode("group")}
              />
              Groupe / Équipe
            </label>
          </div>

          {participantMode === "group" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {groupes.length > 0 && (
                <div>
                  <Label>Groupe existant</Label>
                  <Select value={groupeId} onChange={(e) => setGroupeId(e.target.value)}>
                    <option value="">—</option>
                    {groupes.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div className={groupes.length > 0 ? "" : "sm:col-span-2"}>
                <Label>Nom équipe / groupe</Label>
                <Input value={equipeLibre} onChange={(e) => setEquipeLibre(e.target.value)} />
              </div>
            </div>
          )}

          <BudgetParticipantsSection
            joueurs={joueurs}
            entraineurs={entraineurs}
            joueurIds={joueurIds}
            coachIds={coachIds}
            onJoueursChange={setJoueurIds}
            onCoachsChange={setCoachIds}
          />

          {participantMode === "group" && (
            <BudgetMembresExtraSection
              membres={membresExtras}
              onChange={setMembresExtras}
              allowedTypes={["kine", "federal"]}
              title="Autres membres"
              description="Type obligatoire (fonction) — prénom et nom optionnels."
            />
          )}

          <p className="text-sm font-medium text-frmt-green">
            Total : {totalParticipants} personne{totalParticipants > 1 ? "s" : ""}
            {totalParticipants > 0 && (
              <>
                {" "}
                ({joueurIds.length} joueur{joueurIds.length !== 1 ? "s" : ""}
                {coachIds.length > 0 &&
                  ` + ${coachIds.length} entraîneur${coachIds.length !== 1 ? "s" : ""}`}
                {participantMode === "group" && autresMembresCount > 0 &&
                  ` + ${autresMembresCount} autre${autresMembresCount !== 1 ? "s" : ""} membre${autresMembresCount !== 1 ? "s" : ""}`}
                )
              </>
            )}
          </p>
        </Card>

        <Card premium className="space-y-3 p-4">
          <h2 className="text-sm font-semibold text-tennis">Informations mission</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Objet / titre</Label>
              <Input value={objet} onChange={(e) => setObjet(e.target.value)} required />
            </div>
            {contexteMissionTournoi ? (
              <>
                <div className="sm:col-span-2">
                  <Label>Type</Label>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="contexte-budget"
                        checked={contexteKind === "tournoi"}
                        onChange={() => setContexteKind("tournoi")}
                      />
                      Tournoi
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="radio"
                        name="contexte-budget"
                        checked={contexteKind === "mission"}
                        onChange={() => setContexteKind("mission")}
                      />
                      Mission
                    </label>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label>
                    {contexteKind === "tournoi" ? "Nom du tournoi" : "Nom de la mission"}
                  </Label>
                  <Input
                    value={contexteLibelle}
                    onChange={(e) => setContexteLibelle(e.target.value)}
                    placeholder={
                      contexteKind === "tournoi"
                        ? "Ex. M25 Tanger Clay"
                        : "Ex. Déplacement équipe nationale"
                    }
                  />
                </div>
              </>
            ) : (
              <div>
                <Label>Type</Label>
                <Select
                  value={typeBudget}
                  onChange={(e) =>
                    setTypeBudget(e.target.value as BudgetPrevisionnelInput["type_budget"])
                  }
                >
                  {TYPES_BUDGET.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label>Statut</Label>
              <Select value={statut} onChange={(e) => setStatut(e.target.value as typeof statut)}>
                {STATUTS_BUDGET.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Date début</Label>
              <Input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div>
              <Label>Date fin</Label>
              <Input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
            <div>
              <Label>Pays</Label>
              <Input value={pays} onChange={(e) => setPays(e.target.value)} />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={ville} onChange={(e) => setVille(e.target.value)} />
            </div>
            {!contexteMissionTournoi && (
              <div className="sm:col-span-2">
                <Label>Tournoi / événement</Label>
                <Input value={tournoi} onChange={(e) => setTournoi(e.target.value)} />
              </div>
            )}
          </div>
        </Card>

        <Card premium className="space-y-3 p-4">
          <h2 className="text-sm font-semibold text-tennis">Lignes de budget</h2>
          <p className="text-xs text-muted">
            Saisie adaptée au tennis : hébergement (personnes × nuitées × prix/nuitée), restauration
            (personnes × jours × prix/jour), billets (personnes × prix), etc.
          </p>
          <div className="flex flex-wrap gap-1">
            {LIGNES_BUDGET_PRESETS.map((p) => (
              <Button
                key={p.designation}
                type="button"
                variant="ghost"
                size="sm"
                className="text-[10px]"
                onClick={() =>
                  setLignes((prev) => {
                    const defaults = defaultBudgetLigneValues(p.designation, {
                      nombrePersonnes: totalParticipants,
                      dateDebut,
                      dateFin,
                    });
                    return [
                      ...prev,
                      {
                        ...emptyLine(),
                        designation: p.designation,
                        description: p.description ?? "",
                        ...defaults,
                        ordre: prev.length,
                      },
                    ];
                  })
                }
              >
                + {p.designation}
              </Button>
            ))}
          </div>
          <BudgetPrevisionnelLignesTable
            lignes={lignes}
            devise={devise}
            prixLabel={prixLabel}
            totalParticipants={totalParticipants}
            dateDebut={dateDebut}
            dateFin={dateFin}
            onChange={setLignes}
            onUpdateLigne={updateLigne}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setLignes((prev) => [...prev, { ...emptyLine(), ordre: prev.length }])}
          >
            <Plus className="h-4 w-4" />
            Ajouter une ligne
          </Button>
        </Card>

        <Card premium className="space-y-3 p-4">
          <h2 className="text-sm font-semibold text-tennis">Totaux</h2>
          {devise === "EUR" ? (
            <div className="space-y-2 text-sm">
              <p className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>TOTAL EN EUROS</span>
                <strong>{formatEur(computed.total_eur)}</strong>
              </p>
              <div className="flex items-center justify-between gap-2">
                <span>Taux EUR/MAD :</span>
                <Input
                  type="number"
                  step="0.01"
                  min={0.01}
                  className="max-w-[100px]"
                  value={tauxMad}
                  onChange={(e) => setTauxMad(Number(e.target.value))}
                />
              </div>
              <p className="flex justify-between font-semibold">
                <span>TOTAL EN DIRHAMS</span>
                <strong>{formatMad(computed.total_mad)}</strong>
              </p>
            </div>
          ) : (
            <p className="flex justify-between text-sm font-semibold">
              <span>TOTAL EN DIRHAMS</span>
              <strong>{formatMad(computed.total_mad)}</strong>
            </p>
          )}
          <p className="border-l-2 border-tennis/40 pl-2 text-xs italic text-muted capitalize">
            {computed.montant_lettres_mad}
          </p>
        </Card>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={(e) => void handleSubmit(e, "brouillon")}
          >
            Enregistrer brouillon
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : submitLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void openBudgetPrevisionnelPdf(buildPreviewBudget());
              setPreviewOpen(true);
            }}
          >
            Aperçu PDF
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Annuler
            </Button>
          )}
        </div>
      </form>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Aperçu PDF">
        <p className="text-sm text-muted">
          Le PDF a été ouvert dans un nouvel onglet. Fermez cette fenêtre pour continuer la saisie.
        </p>
      </Modal>
    </>
  );
}

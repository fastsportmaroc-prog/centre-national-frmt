"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BedDouble, Calculator, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { NumericInput } from "@/components/ui/NumericInput";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import {
  provisionStageHebergementAction,
  saveStageHebergementAction,
} from "@/lib/actions/stage-hebergement-actions";
import {
  hebergementToForm,
  suggestedChambresCounts,
  totalChambresFromForm,
} from "@/lib/v2/stage-hebergement-form";
import { countNightsHebergement } from "@/lib/v2/stage-calculations";
import { HebergementParticipantsTab } from "@/components/v2/stages/tabs/HebergementParticipantsTab";
import type {
  EntraineurV2,
  HebergementStageV2,
  JoueurV2,
  StageHebergementForm,
  StageProgrammeV2,
} from "@/lib/types/v2";

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

type Props = {
  stage: StageProgrammeV2;
  hebergement: HebergementStageV2 | null;
  joueurs: Pick<JoueurV2, "id" | "nom" | "prenom">[];
  coachs: Pick<EntraineurV2, "id" | "nom" | "prenom">[];
  nbJoueurs: number;
  nbCoachs: number;
  canManage: boolean;
  onSaved: (
    hebergement: HebergementStageV2 | null,
    stagePatch?: Pick<StageProgrammeV2, "hebergement" | "chambres">
  ) => void;
  toast: (msg: string, type?: "success" | "error" | "info") => void;
};

export function StageHebergementSection({
  stage,
  hebergement,
  joueurs,
  coachs,
  nbJoueurs,
  nbCoachs,
  canManage,
  onSaved,
  toast,
}: Props) {
  const [form, setForm] = useState<StageHebergementForm>(() =>
    hebergementToForm(stage, hebergement, joueurs, coachs, nbJoueurs, nbCoachs)
  );
  const [statut, setStatut] = useState(hebergement?.statut ?? "prevu");
  const [saving, setSaving] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  const applySuggested = useCallback(
    (base: StageHebergementForm) => {
      const counts = suggestedChambresCounts(nbJoueurs, nbCoachs, base);
      return { ...base, ...counts };
    },
    [nbJoueurs, nbCoachs]
  );

  useEffect(() => {
    setForm(hebergementToForm(stage, hebergement, joueurs, coachs, nbJoueurs, nbCoachs));
    setStatut(hebergement?.statut ?? "prevu");
  }, [stage, hebergement, joueurs, coachs, nbJoueurs, nbCoachs]);

  const suggested = useMemo(
    () => suggestedChambresCounts(nbJoueurs, nbCoachs, form),
    [nbJoueurs, nbCoachs, form.type_chambre_joueurs, form.type_chambre_coachs]
  );

  const totalChambres = useMemo(
    () => (form.actif ? totalChambresFromForm(form) : 0),
    [form]
  );

  const nbNuits = useMemo(
    () => (form.actif ? countNightsHebergement(form.date_debut, form.date_fin) : 0),
    [form.actif, form.date_debut, form.date_fin]
  );

  const totalNuitees = totalChambres * nbNuits;

  async function handleSave() {
    setSaving(true);
    const res = await saveStageHebergementAction(stage.id, form, statut);
    setSaving(false);
    if (res.ok) {
      toast("Hébergement enregistré", "success");
      onSaved(res.hebergement, res.stagePatch);
    } else {
      toast(res.error ?? "Échec de l'enregistrement", "error");
    }
  }

  async function handleProvision() {
    setProvisioning(true);
    const res = await provisionStageHebergementAction(stage.id);
    setProvisioning(false);
    if (res.ok && res.hebergement) {
      toast("Hébergement créé automatiquement", "success");
      setForm(hebergementToForm(stage, res.hebergement, joueurs, coachs, nbJoueurs, nbCoachs));
      setStatut(res.hebergement.statut);
      onSaved(res.hebergement, {
        hebergement: true,
        chambres:
          (res.hebergement.nb_chambres_joueurs ?? 0) + (res.hebergement.nb_chambres_coachs ?? 0),
      });
    } else {
      toast(res.error ?? "Impossible de créer l'hébergement", "error");
    }
  }

  const showProvision =
    canManage && !hebergement && (stage.hebergement || form.actif);

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[var(--text-muted)]">
          Basé sur <strong>{nbJoueurs}</strong> joueur{nbJoueurs !== 1 ? "s" : ""} et{" "}
          <strong>{nbCoachs}</strong> membre{nbCoachs !== 1 ? "s" : ""} du staff affectés au stage.
        </p>
        {hebergement && <StatusBadge statut={hebergement.statut} />}
      </div>

      {showProvision && (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/40 p-4">
          <p className="mb-2 text-[var(--text-secondary)]">
            Aucune fiche hébergement liée. Générez-la à partir des dates du stage et des participants.
          </p>
          <Button
            variant="secondary"
            className="gap-1"
            disabled={provisioning}
            onClick={() => void handleProvision()}
          >
            <BedDouble className="h-4 w-4" />
            Créer l&apos;hébergement automatiquement
          </Button>
        </div>
      )}

      {canManage ? (
        <div className="space-y-4 rounded-lg border border-[var(--border)] p-4">
          <Toggle
            label="Hébergement actif pour ce stage"
            checked={form.actif}
            onChange={(actif) => setForm({ ...form, actif })}
          />

          {form.actif && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Date début</Label>
                  <Input
                    type="date"
                    value={form.date_debut}
                    onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Date fin</Label>
                  <Input
                    type="date"
                    value={form.date_fin}
                    onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
                  />
                </div>
                <p className="text-sm text-[var(--text-muted)] sm:col-span-2">
                  <strong>{nbNuits}</strong> nuit{nbNuits !== 1 ? "s" : ""} ·{" "}
                  <strong>{totalNuitees}</strong> nuitée{totalNuitees !== 1 ? "s" : ""} (
                  {totalChambres} chambre{totalChambres !== 1 ? "s" : ""})
                </p>
                <div>
                  <Label>Type chambre joueurs</Label>
                  <Select
                    value={form.type_chambre_joueurs}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type_chambre_joueurs: e.target.value as StageHebergementForm["type_chambre_joueurs"],
                      })
                    }
                  >
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                    <option value="triple">Triple</option>
                  </Select>
                </div>
                <div>
                  <Label>Type chambre staff</Label>
                  <Select
                    value={form.type_chambre_coachs}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type_chambre_coachs: e.target.value as StageHebergementForm["type_chambre_coachs"],
                      })
                    }
                  >
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                  </Select>
                </div>
                <div>
                  <Label>Nombre de chambres joueurs</Label>
                  <NumericInput
                    value={form.nb_chambres_joueurs}
                    onChange={(nb_chambres_joueurs) =>
                      setForm({ ...form, nb_chambres_joueurs })
                    }
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Suggestion : {suggested.nb_chambres_joueurs} (selon {nbJoueurs} joueur
                    {nbJoueurs !== 1 ? "s" : ""} · {form.type_chambre_joueurs})
                  </p>
                </div>
                <div>
                  <Label>Nombre de chambres staff / coachs</Label>
                  <NumericInput
                    value={form.nb_chambres_coachs}
                    onChange={(nb_chambres_coachs) =>
                      setForm({ ...form, nb_chambres_coachs })
                    }
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Suggestion : {suggested.nb_chambres_coachs} (selon {nbCoachs} coach
                    {nbCoachs !== 1 ? "s" : ""} · {form.type_chambre_coachs})
                  </p>
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select value={statut} onChange={(e) => setStatut(e.target.value)}>
                    <option value="prevu">Prévu</option>
                    <option value="confirme">Confirmé</option>
                    <option value="termine">Terminé</option>
                    <option value="annule">Annulé</option>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Toggle
                    label="Kitchenette"
                    checked={form.kitchenette}
                    onChange={(kitchenette) => setForm({ ...form, kitchenette })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1"
                  onClick={() => setForm((f) => applySuggested(f))}
                >
                  <Calculator className="h-3.5 w-3.5" />
                  Recalculer selon les participants
                </Button>
                <span className="text-[var(--text-muted)]">
                  Total : <strong className="text-[var(--text-primary)]">{totalChambres}</strong> chambre
                  {totalChambres !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="rounded-lg border border-dashed border-[var(--border)] p-3">
                <HebergementParticipantsTab
                  stageId={stage.id}
                  stageDateDebut={form.date_debut}
                  stageDateFin={form.date_fin}
                  disabled={!canManage}
                  toast={toast}
                />
              </div>

              <div>
                <Label>Remarques</Label>
                <Textarea
                  rows={3}
                  value={form.remarques}
                  onChange={(e) => setForm({ ...form, remarques: e.target.value })}
                  placeholder="Notes hébergement, pavillon, demandes particulières…"
                />
              </div>
            </>
          )}

          <Button className="gap-1" disabled={saving} onClick={() => void handleSave()}>
            <Save className="h-4 w-4" />
            {saving ? "Enregistrement…" : "Enregistrer l'hébergement"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2 text-[var(--text-secondary)]">
          {form.actif || hebergement ? (
            <>
              <p>
                {form.date_debut} → {form.date_fin} · <strong>{nbNuits}</strong> nuit
                {nbNuits !== 1 ? "s" : ""}
              </p>
              <p>
                Chambres joueurs : <strong>{form.nb_chambres_joueurs}</strong> ({form.type_chambre_joueurs}) ·
                Staff : <strong>{form.nb_chambres_coachs}</strong> ({form.type_chambre_coachs}) · Total{" "}
                <strong>{totalChambres}</strong> · <strong>{totalNuitees}</strong> nuitées
              </p>
              {form.kitchenette && <p>Kitchenette : oui</p>}
              {form.dates_participants_actif && (
                <p>Dates par participant : activées</p>
              )}
              {form.remarques && <p className="italic">{form.remarques}</p>}
            </>
          ) : (
            <p>Pas d&apos;hébergement pour ce stage.</p>
          )}
        </div>
      )}
    </div>
  );
}

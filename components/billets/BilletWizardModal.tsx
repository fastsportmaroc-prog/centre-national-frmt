"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { AirportAutocomplete } from "./AirportAutocomplete";
import {
  AEROPORT_DEPART_DEFAUT_IATA,
  defaultDepartLabel,
  DUREE_SEJOUR_DEFAUT_JOURS,
} from "@/lib/constants/billets";
import { AGENCE_VOYAGE_DEFAUT } from "@/lib/constants/logistique";
import type { DemandeBilletAvionInput } from "@/lib/types/logistique";
import type { Joueur } from "@/lib/types/database";
import { ArrowLeftRight, ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  form: DemandeBilletAvionInput;
  setForm: React.Dispatch<React.SetStateAction<DemandeBilletAvionInput>>;
  joueurs: Joueur[];
  onSubmit: (e: React.FormEvent) => void;
};

const STEPS = [
  { id: 1, title: "Trajet", subtitle: "Aéroports & dates" },
  { id: 2, title: "Détails", subtitle: "Motif & soumission" },
] as const;

export function emptyBilletForm(): DemandeBilletAvionInput {
  const today = new Date().toISOString().split("T")[0]!;
  return {
    demandeur_nom: "",
    demandeur_role: "Coach",
    type_personne: "joueur",
    joueur_concerne_id: null,
    joueur_concerne_nom: null,
    ville_depart: defaultDepartLabel(),
    ville_arrivee: "",
    aeroport_depart_code: AEROPORT_DEPART_DEFAUT_IATA,
    aeroport_arrivee_code: null,
    aller_retour: true,
    duree_sejour_jours: DUREE_SEJOUR_DEFAUT_JOURS,
    date_aller: today,
    date_retour: null,
    preference_horaire: "",
    bagage: "",
    passeport: "",
    motif_deplacement: "",
    contexte: "tournoi",
    urgence: false,
    statut: "en_attente",
    validateur: null,
    date_validation: null,
    agence_voyage: AGENCE_VOYAGE_DEFAUT,
    notes: "",
    piece_jointe_url: null,
    prix_billet: null,
    prix_devise: null,
    aller_retour_accorde: null,
    date_retour_accorde: null,
    depense_joueur_id: null,
    depense_enregistree: false,
  };
}

export function BilletWizardModal({
  open,
  onClose,
  form,
  setForm,
  joueurs,
  onSubmit,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);

  function swapAirports() {
    setForm((f) => ({
      ...f,
      ville_depart: f.ville_arrivee,
      ville_arrivee: f.ville_depart,
      aeroport_depart_code: f.aeroport_arrivee_code,
      aeroport_arrivee_code: f.aeroport_depart_code,
    }));
  }

  function goNext() {
    if (!form.demandeur_nom.trim() || !form.ville_arrivee.trim()) return;
    setStep(2);
  }

  function handleClose() {
    setStep(1);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Demande billet d'avion">
      <div className="flex min-h-[420px] gap-4">
        <nav
          className="flex w-28 shrink-0 flex-col items-center gap-1 border-r border-border pr-3"
          aria-label="Étapes"
        >
          {STEPS.map((s) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id === 1 || step === 2) setStep(s.id);
                }}
                className={`flex w-full flex-col items-center rounded-lg py-2 text-center transition-colors ${
                  active
                    ? "bg-frmt-red/15 text-frmt-red"
                    : done
                      ? "text-frmt-green"
                      : "text-muted hover:bg-surface-elevated"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    active
                      ? "bg-frmt-red text-white"
                      : done
                        ? "bg-frmt-green/20 text-frmt-green"
                        : "bg-surface-elevated"
                  }`}
                >
                  {s.id}
                </span>
                <span className="mt-1 text-xs font-medium">{s.title}</span>
              </button>
            );
          })}
          <div className="mt-2 flex flex-col items-center text-muted">
            {step === 1 ? (
              <ChevronDown className="h-4 w-4 animate-pulse" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </div>
        </nav>

        <form
          onSubmit={onSubmit}
          className="flex min-w-0 flex-1 flex-col"
          onReset={() => setStep(1)}
        >
          <div className="flex-1 overflow-hidden">
            {step === 1 && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Demandeur</Label>
                    <Input
                      required
                      value={form.demandeur_nom}
                      onChange={(e) =>
                        setForm({ ...form, demandeur_nom: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>Joueur concerné</Label>
                    <Select
                      value={form.joueur_concerne_id ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          joueur_concerne_id: e.target.value || null,
                          type_personne: "joueur",
                        })
                      }
                    >
                      <option value="">— Staff / Coach —</option>
                      {joueurs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.prenom} {j.nom}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Trajet</p>
                    <Button type="button" size="sm" variant="secondary" onClick={swapAirports}>
                      <ArrowLeftRight className="h-4 w-4" />
                      Inverser
                    </Button>
                  </div>
                  <AirportAutocomplete
                    label="Aéroport de départ"
                    value={form.ville_depart}
                    iataCode={form.aeroport_depart_code}
                    required
                    onChange={(ville, iata) =>
                      setForm({ ...form, ville_depart: ville, aeroport_depart_code: iata })
                    }
                  />
                  <AirportAutocomplete
                    label="Aéroport d'arrivée"
                    value={form.ville_arrivee}
                    iataCode={form.aeroport_arrivee_code}
                    required
                    onChange={(ville, iata) =>
                      setForm({ ...form, ville_arrivee: ville, aeroport_arrivee_code: iata })
                    }
                  />
                </div>

                <div>
                  <Label>Date aller</Label>
                  <Input
                    type="date"
                    required
                    value={form.date_aller}
                    onChange={(e) => setForm({ ...form, date_aller: e.target.value })}
                  />
                </div>

                <fieldset className="space-y-2 rounded-lg border border-border p-3">
                  <legend className="px-1 text-sm font-medium">Souhait de vol</legend>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="souhaitVol"
                      checked={!form.aller_retour}
                      onChange={() =>
                        setForm({
                          ...form,
                          aller_retour: false,
                          date_retour: null,
                        })
                      }
                    />
                    Aller simple
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="souhaitVol"
                      checked={form.aller_retour}
                      onChange={() =>
                        setForm({
                          ...form,
                          aller_retour: true,
                          date_retour: null,
                        })
                      }
                    />
                    Aller-retour envisagé
                  </label>
                  {form.aller_retour && (
                    <div className="pt-1">
                      <Label>Durée séjour souhaitée (jours)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={90}
                        value={form.duree_sejour_jours ?? DUREE_SEJOUR_DEFAUT_JOURS}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            duree_sejour_jours: Math.max(1, Number(e.target.value) || 1),
                            date_retour: null,
                          })
                        }
                      />
                      <p className="mt-1 text-xs text-muted">
                        La date retour sera fixée à l&apos;accord de la direction.
                      </p>
                    </div>
                  )}
                </fieldset>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="rounded-lg bg-surface-elevated/60 p-3 text-xs text-muted">
                  <p>
                    {form.aeroport_depart_code ?? "—"} → {form.aeroport_arrivee_code ?? "—"} ·{" "}
                    {form.date_aller}
                  </p>
                  <p className="mt-1">
                    {form.aller_retour ? "Aller-retour envisagé" : "Aller simple"}
                    {form.aller_retour && form.duree_sejour_jours
                      ? ` · ~${form.duree_sejour_jours} j`
                      : ""}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Contexte</Label>
                    <Select
                      value={form.contexte}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          contexte: e.target.value as DemandeBilletAvionInput["contexte"],
                        })
                      }
                    >
                      <option value="tournoi">Tournoi</option>
                      <option value="stage">Stage</option>
                      <option value="mission">Mission</option>
                    </Select>
                  </div>
                  <div>
                    <Label>Préférence horaire</Label>
                    <Input
                      value={form.preference_horaire ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, preference_horaire: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label>Motif du déplacement *</Label>
                  <Input
                    required
                    value={form.motif_deplacement}
                    onChange={(e) =>
                      setForm({ ...form, motif_deplacement: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    rows={2}
                    value={form.notes ?? ""}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.urgence}
                    onChange={(e) => setForm({ ...form, urgence: e.target.checked })}
                  />
                  Demande urgente
                </label>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2 border-t border-border pt-3">
            {step === 2 ? (
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                Précédent
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={handleClose}>
                Annuler
              </Button>
            )}
            {step === 1 ? (
              <Button type="button" className="ml-auto" onClick={goNext}>
                Suivant
              </Button>
            ) : (
              <Button type="submit" className="ml-auto">
                Soumettre la demande
              </Button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
}

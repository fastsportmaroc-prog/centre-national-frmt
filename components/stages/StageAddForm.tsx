"use client";

import { useMemo } from "react";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { CATEGORIES_STAGE, SOURCES_STAGE } from "@/lib/constants/stages";
import type { Infrastructure } from "@/lib/types/infrastructures";
import type { StageProgrammeInput, StatutStage } from "@/lib/types/stages";
import type { StageLogistiquePack } from "@/lib/types/stage-logistique";
import {
  calculateAccommodationNeeds,
  calculateMealNeeds,
  calculateStageDuration,
  calculateStageParticipants,
  defaultHebergementConfig,
  defaultRestaurationConfig,
  defaultTerrainsConfig,
} from "@/lib/stages/stage-calculations";
import { statutStageLabel } from "@/lib/utils/stage-automation";

const STATUTS: StatutStage[] = ["prevu", "confirme", "en_cours", "termine", "annule"];

type Option = { id: string; label: string };

type Props = {
  form: StageProgrammeInput;
  logistique: StageLogistiquePack;
  joueurs: Option[];
  entraineurs: Option[];
  infrastructures: Infrastructure[];
  onFormChange: (f: StageProgrammeInput) => void;
  onLogistiqueChange: (p: StageLogistiquePack) => void;
};

export function StageAddForm({
  form,
  logistique,
  joueurs,
  entraineurs,
  infrastructures,
  onFormChange,
  onLogistiqueChange,
}: Props) {
  const participants = useMemo(
    () => calculateStageParticipants(logistique.joueur_ids, logistique.entraineur_ids),
    [logistique.joueur_ids, logistique.entraineur_ids]
  );

  const duree = useMemo(
    () => calculateStageDuration(form.date_debut, form.date_fin),
    [form.date_debut, form.date_fin]
  );

  const hebergementCalc = useMemo(() => {
    if (!logistique.hebergement?.actif) return null;
    return calculateAccommodationNeeds(
      logistique.hebergement,
      participants.joueurs,
      participants.coachs
    );
  }, [logistique.hebergement, participants]);

  const repasCalc = useMemo(() => {
    if (!logistique.restauration?.actif) return null;
    return calculateMealNeeds(logistique.restauration, participants.total);
  }, [logistique.restauration, participants.total]);

  const terrainsList = infrastructures.filter(
    (i) =>
      i.actif &&
      (i.type === "terrain" ||
        i.nom.toLowerCase().includes("court") ||
        i.type === "fitness" ||
        i.type === "natation" ||
        i.type === "emplacement_physique")
  );

  function toggleJoueur(id: string) {
    const set = new Set(logistique.joueur_ids);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const ids = [...set];
    onLogistiqueChange({ ...logistique, joueur_ids: ids });
    onFormChange({ ...form, nombre_joueurs: ids.length });
  }

  function toggleCoach(id: string) {
    const set = new Set(logistique.entraineur_ids);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const ids = [...set];
    onLogistiqueChange({ ...logistique, entraineur_ids: ids });
    onFormChange({ ...form, entraineur_ids: ids, nombre_encadrants: ids.length });
  }

  function setHebergementActif(actif: boolean) {
    const hebergement = actif
      ? logistique.hebergement ?? defaultHebergementConfig(form.date_debut, form.date_fin)
      : null;
    onLogistiqueChange({ ...logistique, hebergement: actif ? { ...hebergement!, actif: true } : null });
    onFormChange({ ...form, hebergement: actif });
  }

  function setRestaurationActif(actif: boolean) {
    const restauration = actif
      ? logistique.restauration ?? defaultRestaurationConfig(form.date_debut, form.date_fin)
      : null;
    onLogistiqueChange({
      ...logistique,
      restauration: actif ? { ...restauration!, actif: true } : null,
    });
  }

  function setTerrainsActif(actif: boolean) {
    const terrains = actif ? logistique.terrains ?? defaultTerrainsConfig() : null;
    onLogistiqueChange({ ...logistique, terrains: actif ? { ...terrains!, actif: true } : null });
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-semibold text-frmt-green">A. Informations générales</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nom du stage *</Label>
            <Input
              required
              value={form.stage_action}
              onChange={(e) => onFormChange({ ...form, stage_action: e.target.value })}
            />
          </div>
          <div>
            <Label>Source</Label>
            <Select value={form.source} onChange={(e) => onFormChange({ ...form, source: e.target.value })}>
              {SOURCES_STAGE.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Catégorie</Label>
            <Select value={form.categorie} onChange={(e) => onFormChange({ ...form, categorie: e.target.value })}>
              {CATEGORIES_STAGE.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Date début</Label>
            <Input
              type="date"
              required
              value={form.date_debut}
              onChange={(e) => onFormChange({ ...form, date_debut: e.target.value })}
            />
          </div>
          <div>
            <Label>Date fin</Label>
            <Input
              type="date"
              required
              value={form.date_fin}
              onChange={(e) => onFormChange({ ...form, date_fin: e.target.value })}
            />
          </div>
          <div>
            <Label>Statut</Label>
            <Select
              value={form.statut}
              onChange={(e) => onFormChange({ ...form, statut: e.target.value as StatutStage })}
            >
              {STATUTS.map((s) => (
                <option key={s} value={s}>{statutStageLabel(s)}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Lieu</Label>
            <Input value={form.lieu ?? ""} onChange={(e) => onFormChange({ ...form, lieu: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Description / notes</Label>
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <p className="text-xs text-muted">Durée : {duree} jour(s)</p>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-semibold text-frmt-green">B. Participants</legend>
        <div className="grid gap-3 lg:grid-cols-2">
          <div>
            <Label>Joueurs concernés</Label>
            <div className="mt-1 overflow-hidden rounded border border-border p-2 space-y-1">
              {joueurs.length === 0 ? (
                <p className="text-xs text-muted">Aucun joueur en base</p>
              ) : (
                joueurs.map((j) => (
                  <label key={j.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={logistique.joueur_ids.includes(j.id)}
                      onChange={() => toggleJoueur(j.id)}
                    />
                    {j.label}
                  </label>
                ))
              )}
            </div>
          </div>
          <div>
            <Label>Coachs / staff</Label>
            <div className="mt-1 overflow-hidden rounded border border-border p-2 space-y-1">
              {entraineurs.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={logistique.entraineur_ids.includes(c.id)}
                    onChange={() => toggleCoach(c.id)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <Card className="p-3 text-sm">
          Joueurs : <strong>{participants.joueurs}</strong> · Coachs :{" "}
          <strong>{participants.coachs}</strong> · Total :{" "}
          <strong>{participants.total}</strong>
        </Card>
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-semibold text-frmt-green">C. Hébergement</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!logistique.hebergement?.actif}
            onChange={(e) => setHebergementActif(e.target.checked)}
          />
          Avec hébergement ?
        </label>
        {logistique.hebergement?.actif && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Date début hébergement</Label>
              <Input
                type="date"
                value={logistique.hebergement.date_debut}
                onChange={(e) =>
                  onLogistiqueChange({
                    ...logistique,
                    hebergement: { ...logistique.hebergement!, date_debut: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <Label>Date fin hébergement</Label>
              <Input
                type="date"
                value={logistique.hebergement.date_fin}
                onChange={(e) =>
                  onLogistiqueChange({
                    ...logistique,
                    hebergement: { ...logistique.hebergement!, date_fin: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <Label>Chambres joueurs</Label>
              <Select
                value={logistique.hebergement.type_chambre_joueurs}
                onChange={(e) =>
                  onLogistiqueChange({
                    ...logistique,
                    hebergement: {
                      ...logistique.hebergement!,
                      type_chambre_joueurs: e.target.value as "individuelle" | "double" | "triple",
                    },
                  })
                }
              >
                <option value="individuelle">Individuelle</option>
                <option value="double">Double</option>
                <option value="triple">Triple</option>
              </Select>
            </div>
            <div>
              <Label>Chambres staff</Label>
              <Select
                value={logistique.hebergement.type_chambre_staff}
                onChange={(e) =>
                  onLogistiqueChange({
                    ...logistique,
                    hebergement: {
                      ...logistique.hebergement!,
                      type_chambre_staff: e.target.value as "individuelle" | "double",
                    },
                  })
                }
              >
                <option value="individuelle">Individuelle</option>
                <option value="double">Double</option>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={logistique.hebergement.kitchenette}
                onChange={(e) =>
                  onLogistiqueChange({
                    ...logistique,
                    hebergement: { ...logistique.hebergement!, kitchenette: e.target.checked },
                  })
                }
              />
              Chambres avec kitchenette
            </label>
            {logistique.hebergement.kitchenette && (
              <div>
                <Label>Nombre kitchenette</Label>
                <Input
                  type="number"
                  min={0}
                  value={logistique.hebergement.chambres_kitchenette}
                  onChange={(e) =>
                    onLogistiqueChange({
                      ...logistique,
                      hebergement: {
                        ...logistique.hebergement!,
                        chambres_kitchenette: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label>Remarques hébergement</Label>
              <Textarea
                rows={2}
                value={logistique.hebergement.remarques ?? ""}
                onChange={(e) =>
                  onLogistiqueChange({
                    ...logistique,
                    hebergement: { ...logistique.hebergement!, remarques: e.target.value || null },
                  })
                }
              />
            </div>
            {hebergementCalc && (
              <Card className="sm:col-span-2 p-3 text-xs text-muted">
                {hebergementCalc.chambres_joueurs} ch. joueurs · {hebergementCalc.chambres_staff} ch. staff ·{" "}
                {hebergementCalc.chambres_kitchenette} kitchenette · Total {hebergementCalc.total_chambres} chambres ·{" "}
                {hebergementCalc.total_nuitees} nuitées
              </Card>
            )}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-semibold text-frmt-green">D. Restauration</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!logistique.restauration?.actif}
            onChange={(e) => setRestaurationActif(e.target.checked)}
          />
          Avec restauration ?
        </label>
        {logistique.restauration?.actif && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              {(["petit_dejeuner", "dejeuner", "diner"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={logistique.restauration![k]}
                    onChange={(e) =>
                      onLogistiqueChange({
                        ...logistique,
                        restauration: { ...logistique.restauration!, [k]: e.target.checked },
                      })
                    }
                  />
                  {k === "petit_dejeuner" ? "Petit-déjeuner" : k === "dejeuner" ? "Déjeuner" : "Dîner"}
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Date début restauration</Label>
                <Input
                  type="date"
                  value={logistique.restauration.date_debut}
                  onChange={(e) =>
                    onLogistiqueChange({
                      ...logistique,
                      restauration: { ...logistique.restauration!, date_debut: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Date fin restauration</Label>
                <Input
                  type="date"
                  value={logistique.restauration.date_fin}
                  onChange={(e) =>
                    onLogistiqueChange({
                      ...logistique,
                      restauration: { ...logistique.restauration!, date_fin: e.target.value },
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Allergies / remarques</Label>
                <Textarea
                  rows={2}
                  value={logistique.restauration.allergies ?? ""}
                  onChange={(e) =>
                    onLogistiqueChange({
                      ...logistique,
                      restauration: {
                        ...logistique.restauration!,
                        allergies: e.target.value || null,
                      },
                    })
                  }
                />
              </div>
            </div>
            {repasCalc && (
              <Card className="p-3 text-xs text-muted">
                PDJ {repasCalc.petits_dejeuners} · Déjeuners {repasCalc.dejeuners} · Dîners {repasCalc.diners} · Total{" "}
                {repasCalc.total_repas} repas
              </Card>
            )}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-3 rounded-lg border border-border p-3">
        <legend className="px-1 text-sm font-semibold text-frmt-green">E. Courts / terrains</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!logistique.terrains?.actif}
            onChange={(e) => setTerrainsActif(e.target.checked)}
          />
          Besoin terrains ?
        </label>
        {logistique.terrains?.actif && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Nombre de courts</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={logistique.terrains.nombre_courts}
                onChange={(e) =>
                  onLogistiqueChange({
                    ...logistique,
                    terrains: {
                      ...logistique.terrains!,
                      nombre_courts: Math.max(1, Number(e.target.value) || 1),
                    },
                  })
                }
              />
            </div>
            <div>
              <Label>Surface</Label>
              <Select
                value={logistique.terrains.surface}
                onChange={(e) =>
                  onLogistiqueChange({
                    ...logistique,
                    terrains: {
                      ...logistique.terrains!,
                      surface: e.target.value as "terre_battue" | "dur" | "indifferent",
                    },
                  })
                }
              >
                <option value="terre_battue">Terre battue</option>
                <option value="dur">Dur</option>
                <option value="indifferent">Indifférent</option>
              </Select>
            </div>
            <div>
              <Label>Créneau</Label>
              <Select
                value={logistique.terrains.creneau}
                onChange={(e) =>
                  onLogistiqueChange({
                    ...logistique,
                    terrains: {
                      ...logistique.terrains!,
                      creneau: e.target.value as "journee" | "matin" | "apres_midi" | "personnalise",
                    },
                  })
                }
              >
                <option value="journee">Journée (09:00–18:00)</option>
                <option value="matin">Matin (09:00–12:00)</option>
                <option value="apres_midi">Après-midi (15:00–18:00)</option>
                <option value="personnalise">Personnalisé</option>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={logistique.terrains.affectation_auto}
                onChange={(e) =>
                  onLogistiqueChange({
                    ...logistique,
                    terrains: { ...logistique.terrains!, affectation_auto: e.target.checked },
                  })
                }
              />
              Affectation automatique des courts disponibles
            </label>
            {!logistique.terrains.affectation_auto && (
              <div className="sm:col-span-2 overflow-hidden rounded border border-border p-2 space-y-1">
                {terrainsList.map((infra) => (
                  <label key={infra.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={logistique.terrains!.infrastructure_ids_manuels.includes(infra.id)}
                      onChange={() => {
                        const set = new Set(logistique.terrains!.infrastructure_ids_manuels);
                        if (set.has(infra.id)) set.delete(infra.id);
                        else set.add(infra.id);
                        onLogistiqueChange({
                          ...logistique,
                          terrains: {
                            ...logistique.terrains!,
                            infrastructure_ids_manuels: [...set],
                          },
                        });
                      }}
                    />
                    {infra.nom} ({infra.surface})
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </fieldset>
    </div>
  );
}

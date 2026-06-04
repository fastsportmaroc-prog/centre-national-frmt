"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import {
  PROGRAMMATION_SURFACE_LABELS,
  PROGRAMMATION_TYPE_OPTIONS,
  TOURNOI_TYPES,
} from "@/lib/constants/programmation-joueurs";
import type {
  CreateProgrammationPayload,
  ProgrammationEvenementEnriched,
  ProgrammationEvenementInput,
  ProgrammationType,
} from "@/lib/types/programmation-joueurs";
import type { JoueurV2 } from "@/lib/types/v2";

type Props = {
  open: boolean;
  onClose: () => void;
  joueurs: JoueurV2[];
  initial?: ProgrammationEvenementEnriched | null;
  defaultJoueurIds?: string[];
  onSubmit: (
    payload: CreateProgrammationPayload | Partial<ProgrammationEvenementInput>,
    isEdit: boolean,
    id?: string
  ) => Promise<void>;
};

const emptyForm = (): ProgrammationEvenementInput => ({
  joueur_id: "",
  type: "tournoi_itf",
  nom: "",
  pays: null,
  ville: null,
  date_debut: new Date().toISOString().slice(0, 10),
  date_fin: new Date().toISOString().slice(0, 10),
  surface: null,
  altitude: null,
  categorie_tournoi: null,
  dotation_usd: null,
  points_gain_vainqueur: null,
  tableau: null,
  wild_card: false,
  classement_requis: null,
  site_officiel: null,
  statut: "a_venir",
  resultat_simple: null,
  resultat_double: null,
  points_gagnes: null,
  prize_money_usd: null,
  notes_coach: null,
  billet_avion_id: null,
  hebergement_id: null,
  visa_requis: false,
  per_diem_prevu: null,
  competition_id: null,
});

export function FormulaireEvenement({
  open,
  onClose,
  joueurs,
  initial,
  defaultJoueurIds,
  onSubmit,
}: Props) {
  const isEdit = Boolean(initial?.id);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState<ProgrammationEvenementInput>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const {
        id: _id,
        created_at: _c,
        updated_at: _u,
        created_by: _b,
        joueur_nom: _jn,
        joueur_prenom: _jp,
        joueur_photo_url: _jph,
        joueur_categorie: _jc,
        joueur_classement: _jcl,
        ...rest
      } = initial;
      setForm(rest);
      setSelectedIds([initial.joueur_id]);
    } else {
      setForm(emptyForm());
      setSelectedIds(defaultJoueurIds ?? []);
    }
  }, [open, initial, defaultJoueurIds]);

  const isTournoi = TOURNOI_TYPES.includes(form.type);

  function patch(p: Partial<ProgrammationEvenementInput>) {
    setForm((prev) => ({ ...prev, ...p }));
  }

  function toggleJoueur(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (!form.nom.trim()) return;
    if (!isEdit && !selectedIds.length) return;
    setSaving(true);
    try {
      if (isEdit && initial) {
        await onSubmit(form, true, initial.id);
      } else {
        await onSubmit({ ...form, joueur_ids: selectedIds }, false);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Modifier l'événement" : "Ajouter un événement"}
      panelClassName="max-w-2xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={saving} onClick={() => void handleSave()}>
            {saving ? "…" : isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {!isEdit && (
          <div>
            <Label>Joueur(s)</Label>
            <div className="mt-2 max-h-32 overflow-y-auto rounded border border-[var(--border)] p-2">
              {joueurs.map((j) => (
                <label key={j.id} className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(j.id)}
                    onChange={() => toggleJoueur(j.id)}
                  />
                  {j.prenom} {j.nom}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Type</Label>
            <Select
              value={form.type}
              onChange={(e) => patch({ type: e.target.value as ProgrammationType })}
            >
              {PROGRAMMATION_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Nom</Label>
            <Input value={form.nom} onChange={(e) => patch({ nom: e.target.value })} />
          </div>
          <div>
            <Label>Pays</Label>
            <Input value={form.pays ?? ""} onChange={(e) => patch({ pays: e.target.value || null })} />
          </div>
          <div>
            <Label>Ville</Label>
            <Input value={form.ville ?? ""} onChange={(e) => patch({ ville: e.target.value || null })} />
          </div>
          <div>
            <Label>Date début</Label>
            <Input
              type="date"
              value={form.date_debut.slice(0, 10)}
              onChange={(e) => patch({ date_debut: e.target.value })}
            />
          </div>
          <div>
            <Label>Date fin</Label>
            <Input
              type="date"
              value={form.date_fin.slice(0, 10)}
              onChange={(e) => patch({ date_fin: e.target.value })}
            />
          </div>
          <div>
            <Label>Surface</Label>
            <Select
              value={form.surface ?? ""}
              onChange={(e) =>
                patch({ surface: (e.target.value || null) as ProgrammationEvenementInput["surface"] })
              }
            >
              <option value="">—</option>
              {Object.entries(PROGRAMMATION_SURFACE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Altitude (m)</Label>
            <Input
              type="number"
              value={form.altitude ?? ""}
              onChange={(e) => patch({ altitude: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        </div>

        {isTournoi && (
          <div className="grid gap-3 rounded border border-[var(--border)] p-3 sm:grid-cols-2">
            <p className="sm:col-span-2 text-xs font-medium text-[var(--text-secondary)]">Tournoi</p>
            <div>
              <Label>Catégorie</Label>
              <Input
                value={form.categorie_tournoi ?? ""}
                onChange={(e) => patch({ categorie_tournoi: e.target.value || null })}
                placeholder="ATP 250, ITF M25…"
              />
            </div>
            <div>
              <Label>Dotation USD</Label>
              <Input
                type="number"
                value={form.dotation_usd ?? ""}
                onChange={(e) => patch({ dotation_usd: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div>
              <Label>Points vainqueur</Label>
              <Input
                type="number"
                value={form.points_gain_vainqueur ?? ""}
                onChange={(e) =>
                  patch({ points_gain_vainqueur: e.target.value ? Number(e.target.value) : null })
                }
              />
            </div>
            <div>
              <Label>Tableau</Label>
              <Select
                value={form.tableau ?? ""}
                onChange={(e) =>
                  patch({ tableau: (e.target.value || null) as ProgrammationEvenementInput["tableau"] })
                }
              >
                <option value="">—</option>
                <option value="simple">Simple</option>
                <option value="double">Double</option>
                <option value="les_deux">Les deux</option>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.wild_card}
                onChange={(e) => patch({ wild_card: e.target.checked })}
              />
              Wild card
            </label>
          </div>
        )}

        <div className="grid gap-3 rounded border border-[var(--border)] p-3 sm:grid-cols-2">
          <p className="sm:col-span-2 text-xs font-medium text-[var(--text-secondary)]">Résultats</p>
          <div>
            <Label>Résultat simple</Label>
            <Input
              value={form.resultat_simple ?? ""}
              onChange={(e) => patch({ resultat_simple: e.target.value || null })}
              placeholder="QF, Finaliste…"
            />
          </div>
          <div>
            <Label>Points gagnés</Label>
            <Input
              type="number"
              value={form.points_gagnes ?? ""}
              onChange={(e) => patch({ points_gagnes: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes coach</Label>
            <Input
              value={form.notes_coach ?? ""}
              onChange={(e) => patch({ notes_coach: e.target.value || null })}
            />
          </div>
        </div>

        <div className="grid gap-3 rounded border border-[var(--border)] p-3 sm:grid-cols-2">
          <p className="sm:col-span-2 text-xs font-medium text-[var(--text-secondary)]">
            Logistique (références ID)
          </p>
          <div>
            <Label>Billet avion ID</Label>
            <Input
              value={form.billet_avion_id ?? ""}
              onChange={(e) => patch({ billet_avion_id: e.target.value || null })}
            />
          </div>
          <div>
            <Label>Hébergement ID</Label>
            <Input
              value={form.hebergement_id ?? ""}
              onChange={(e) => patch({ hebergement_id: e.target.value || null })}
            />
          </div>
          <div>
            <Label>Compétition ID</Label>
            <Input
              value={form.competition_id ?? ""}
              onChange={(e) => patch({ competition_id: e.target.value || null })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.visa_requis}
              onChange={(e) => patch({ visa_requis: e.target.checked })}
            />
            Visa requis
          </label>
        </div>
      </div>
    </Modal>
  );
}

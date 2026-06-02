"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { CategorySelect } from "@/components/v2/ui/CategorySelect";
import { updateStageQuickAction } from "@/lib/actions/stage-actions";
import { useToast } from "@/components/v2/ui/ToastProvider";
import type { StageProgrammeV2, StatutStageV2 } from "@/lib/types/v2";

type StagePatch = Pick<
  StageProgrammeV2,
  "categorie" | "stage_action" | "date_debut" | "date_fin" | "lieu" | "statut"
>;
type StageQuickEditForm = StagePatch & {
  lieu: string;
};

type Props = {
  stage: StageProgrammeV2 | null;
  open: boolean;
  onClose: () => void;
  onSaved: (patch: StagePatch) => void;
};

export function StageQuickEditModal({ stage, open, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<StageQuickEditForm>({
    stage_action: "",
    categorie: "U16",
    date_debut: "",
    date_fin: "",
    lieu: "",
    statut: "prevu",
  });

  useEffect(() => {
    if (!stage || !open) return;
    setForm({
      stage_action: stage.stage_action,
      categorie: stage.categorie,
      date_debut: stage.date_debut.slice(0, 10),
      date_fin: stage.date_fin.slice(0, 10),
      lieu: stage.lieu ?? "",
      statut: String(stage.statut) as StatutStageV2,
    });
  }, [stage, open]);

  async function handleSave() {
    if (!stage) return;
    if (!form.stage_action.trim()) {
      toast("Le nom du stage est obligatoire", "error");
      return;
    }
    if (form.date_fin < form.date_debut) {
      toast("La date de fin doit être après la date de début", "error");
      return;
    }

    setSaving(true);
    const payload = {
      stage_action: form.stage_action.trim(),
      categorie: form.categorie,
      date_debut: form.date_debut,
      date_fin: form.date_fin,
      lieu: form.lieu.trim() || null,
      statut: form.statut,
    };
    const res = await updateStageQuickAction(stage.id, payload);
    setSaving(false);

    if (!res.ok) {
      toast(res.error ?? "Enregistrement impossible", "error");
      return;
    }

    toast("Stage mis à jour", "success");
    onSaved(payload);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Modifier le stage"
      panelClassName="max-w-lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={saving || !form.stage_action.trim()} onClick={() => void handleSave()}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>Nom du stage</Label>
          <Input
            value={form.stage_action}
            onChange={(e) => setForm({ ...form, stage_action: e.target.value })}
          />
        </div>
        <div>
          <Label>Catégorie</Label>
          <CategorySelect
            value={form.categorie}
            onChange={(categorie) => setForm({ ...form, categorie })}
          />
        </div>
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
        </div>
        <div>
          <Label>Statut</Label>
          <Select
            value={String(form.statut)}
            onChange={(e) => setForm({ ...form, statut: e.target.value as StatutStageV2 })}
          >
            <option value="prevu">Prévu</option>
            <option value="confirme">Confirmé</option>
            <option value="termine">Terminé</option>
            <option value="annule">Annulé</option>
          </Select>
        </div>
        <div>
          <Label>Lieu</Label>
          <Input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}

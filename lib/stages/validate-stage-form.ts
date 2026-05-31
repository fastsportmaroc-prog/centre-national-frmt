import type { StageProgrammeInput } from "@/lib/types/stages";

export function validateStageForm(
  form: StageProgrammeInput
): { ok: true } | { ok: false; message: string } {
  if (!form.stage_action?.trim()) {
    return { ok: false, message: "Le nom du stage est obligatoire." };
  }
  if (!form.date_debut || !form.date_fin) {
    return { ok: false, message: "Les dates de début et de fin sont obligatoires." };
  }
  if (form.date_fin < form.date_debut) {
    return { ok: false, message: "La date de fin doit être après la date de début." };
  }
  return { ok: true };
}

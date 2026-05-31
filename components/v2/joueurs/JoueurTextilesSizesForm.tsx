"use client";

import { PersonEquipementTaillesForm } from "@/components/v2/equipement/PersonEquipementTaillesForm";
import type { JoueurV2 } from "@/lib/types/v2";

/** @deprecated Préférer PersonEquipementTaillesForm */
export function JoueurTextilesSizesForm({
  joueur,
  canWrite,
  editable,
  onSaved,
  compact,
}: {
  joueur: JoueurV2;
  /** @deprecated Utiliser editable */
  canWrite?: boolean;
  editable?: boolean;
  onSaved?: (j: JoueurV2) => void;
  compact?: boolean;
}) {
  const canEdit = editable ?? canWrite ?? true;
  return (
    <PersonEquipementTaillesForm
      kind="joueur"
      person={joueur}
      editable={canEdit}
      onSaved={onSaved}
      compact={compact}
    />
  );
}

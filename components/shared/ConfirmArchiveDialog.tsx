"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type Props = {
  open: boolean;
  title: string;
  description: string;
  entityLabel?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
  loading?: boolean;
};

export function ConfirmArchiveDialog({
  open,
  title,
  description,
  entityLabel,
  onClose,
  onConfirm,
  loading,
}: Props) {
  const [reason, setReason] = useState("");

  async function handleConfirm() {
    await onConfirm(reason.trim());
    setReason("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-muted">{description}</p>
        {entityLabel && (
          <p className="rounded-lg bg-surface-elevated px-3 py-2 text-sm font-medium text-foreground">
            {entityLabel}
          </p>
        )}
        <p className="text-xs text-muted">
          Archivage logique — les données restent en base et dans l&apos;historique.
        </p>
        <div>
          <Label htmlFor="archive-reason">Motif (optionnel)</Label>
          <Input
            id="archive-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison de l'archivage…"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} disabled={loading}>
            {loading ? "Archivage…" : "Archiver"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

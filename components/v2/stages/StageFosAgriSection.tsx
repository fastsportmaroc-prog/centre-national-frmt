"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import {
  deleteStageFosAgriDocumentAction,
  getStageFosAgriDocumentsAction,
  uploadStageFosAgriDocumentAction,
} from "@/lib/actions/stage-fos-agri-actions";
import type { StageFosAgriDocumentV2 } from "@/lib/types/v2";
import { cn } from "@/lib/utils/cn";

const SLOTS: { slot: 1 | 2; label: string }[] = [
  { slot: 1, label: "Document PDF 1" },
  { slot: 2, label: "Document PDF 2 (optionnel)" },
];

type Props = {
  stageId: string;
  canManage: boolean;
  onDocumentsChange?: (hasAtLeastOne: boolean) => void;
  toast: (message: string, variant?: "success" | "error" | "warning") => void;
};

export function StageFosAgriSection({
  stageId,
  canManage,
  onDocumentsChange,
  toast,
}: Props) {
  const [documents, setDocuments] = useState<StageFosAgriDocumentV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySlot, setBusySlot] = useState<1 | 2 | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await getStageFosAgriDocumentsAction(stageId);
    setDocuments(rows);
    onDocumentsChange?.(rows.length > 0);
    setLoading(false);
  }, [stageId, onDocumentsChange]);

  useEffect(() => {
    void load();
  }, [load]);

  function docForSlot(slot: 1 | 2) {
    return documents.find((d) => d.slot === slot);
  }

  async function handleUpload(slot: 1 | 2, file: File | null) {
    if (!file) return;
    setBusySlot(slot);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadStageFosAgriDocumentAction(stageId, slot, fd);
    setBusySlot(null);
    if (!res.ok) {
      toast(res.error ?? "Échec de l’envoi", "error");
      return;
    }
    toast(slot === 1 ? "Document 1 enregistré" : "Document 2 enregistré", "success");
    await load();
  }

  async function handleDelete(slot: 1 | 2) {
    if (!confirm("Supprimer ce PDF ?")) return;
    setBusySlot(slot);
    const res = await deleteStageFosAgriDocumentAction(stageId, slot);
    setBusySlot(null);
    if (!res.ok) {
      toast(res.error ?? "Suppression impossible", "error");
      return;
    }
    toast("Document supprimé", "success");
    await load();
  }

  const hasAny = documents.length > 0;

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-frmt-green">Procédure administrative</h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            hasAny ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          )}
        >
          {hasAny ? "Complet" : "Manquant"}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted">
        Joignez un ou deux fichiers PDF. Le badge sur la liste des stages passe au vert dès qu&apos;au
        moins un PDF est enregistré.
      </p>

      {loading ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {SLOTS.map(({ slot, label }) => {
            const doc = docForSlot(slot);
            const busy = busySlot === slot;
            return (
              <div
                key={slot}
                className="rounded-lg border border-border bg-[var(--bg-main)] p-3"
              >
                <Label className="mb-2 block text-xs font-medium">{label}</Label>
                {doc ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-frmt-green" />
                      <span className="break-all" title={doc.file_name}>
                        {doc.file_name}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-frmt-green hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ouvrir
                      </a>
                      {canManage && (
                        <>
                          <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted hover:text-foreground">
                            <Upload className="h-3 w-3" />
                            {busy ? "Envoi…" : "Remplacer"}
                            <input
                              type="file"
                              accept="application/pdf,.pdf"
                              className="sr-only"
                              disabled={busy}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                void handleUpload(slot, f ?? null);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs text-red-400 hover:underline"
                            disabled={busy}
                            onClick={() => void handleDelete(slot)}
                          >
                            <Trash2 className="h-3 w-3" />
                            Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : canManage ? (
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted hover:border-frmt-green/50 hover:bg-surface-elevated/40">
                    <Upload className="h-5 w-5" />
                    {busy ? "Envoi en cours…" : "Choisir un PDF"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      disabled={busy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        void handleUpload(slot, f ?? null);
                        e.target.value = "";
                      }}
                    />
                  </label>
                ) : (
                  <p className="text-xs text-muted">Aucun fichier</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

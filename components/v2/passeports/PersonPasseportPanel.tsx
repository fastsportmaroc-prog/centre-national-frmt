"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { DocumentUpload } from "@/components/passeport/DocumentUpload";
import { formatDateFr, normalizeDateForInput } from "@/lib/passeport/date-utils";
import { DocumentExpirationBadge } from "@/components/v2/passeports/DocumentExpirationBadge";
import { useToast } from "@/components/v2/ui/ToastProvider";
import {
  createAdminDocument,
  deleteAdminDocument,
  getAdminDocumentsRaw,
  updateAdminDocument,
} from "@/lib/data/admin-documents";
import { upsertOwnerPasseportDocument } from "@/lib/passeport/upsert-owner-passeport";
import { uploadAdminDocumentFile } from "@/lib/storage/upload-admin-document";
import { canManagePasseports } from "@/lib/auth/passeports-access";
import { useRole } from "@/lib/hooks/useRole";
import type { AdminDocument, AdminDocumentOwnerType } from "@/lib/types/admin-document";
import { ExternalLink, IdCard, Plus, Trash2 } from "lucide-react";

type Props = {
  ownerType: AdminDocumentOwnerType;
  ownerId: string;
  ownerLabel: string;
  passeportNumero?: string | null;
  passeportExpiration?: string | null;
  /** Met à jour les champs passeport sur la fiche joueur / coach */
  onFichePasseportChange?: (
    numero: string | null,
    expiration: string | null
  ) => void | Promise<void>;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture fichier impossible"));
    reader.readAsDataURL(file);
  });
}

export function PersonPasseportPanel({
  ownerType,
  ownerId,
  ownerLabel,
  passeportNumero,
  passeportExpiration,
  onFichePasseportChange,
}: Props) {
  const { toast } = useToast();
  const { role } = useRole();
  const canManage = canManagePasseports(role);

  const [docs, setDocs] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [numero, setNumero] = useState("");
  const [expiration, setExpiration] = useState("");
  const [country, setCountry] = useState("");
  const [notes, setNotes] = useState("");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editingPasseportId, setEditingPasseportId] = useState<string | null>(null);

  const ownerDocs = useMemo(
    () => docs.filter((d) => d.owner_type === ownerType && d.owner_id === ownerId),
    [docs, ownerType, ownerId]
  );

  const passeportDoc = useMemo(
    () => ownerDocs.find((d) => d.document_type === "passeport"),
    [ownerDocs]
  );

  const visaDocs = useMemo(
    () => ownerDocs.filter((d) => d.document_type === "visa"),
    [ownerDocs]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await getAdminDocumentsRaw());
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur chargement documents", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (passeportDoc) {
      setNumero(passeportDoc.document_number ?? "");
      setExpiration(normalizeDateForInput(passeportDoc.expiration_date));
      setCountry(passeportDoc.country ?? "");
      setNotes(passeportDoc.notes ?? "");
      setFileUrl(passeportDoc.file_url);
      setEditingPasseportId(passeportDoc.id);
    } else {
      setNumero(passeportNumero?.trim() ?? "");
      setExpiration(normalizeDateForInput(passeportExpiration));
      setCountry("");
      setNotes("");
      setFileUrl(null);
      setEditingPasseportId(null);
    }
  }, [passeportDoc, passeportNumero, passeportExpiration]);

  function openNewPasseport() {
    setShowForm(true);
    if (!passeportDoc) {
      setNumero(passeportNumero?.trim() ?? "");
      setExpiration(normalizeDateForInput(passeportExpiration));
      setCountry("");
      setNotes("");
      setFileUrl(null);
      setEditingPasseportId(null);
    }
  }

  async function handleSavePasseport() {
    if (!canManage) return;
    if (!numero.trim()) {
      toast("Le numéro de passeport est obligatoire", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await upsertOwnerPasseportDocument(ownerType, ownerId, {
        document_number: numero,
        expiration_date: expiration || null,
        country: country || null,
        notes: notes || null,
        file_url: fileUrl,
      });
      if (res.error || !res.data) {
        toast(res.error ?? "Erreur enregistrement passeport", "error");
        return;
      }

      let docId = res.data.id;
      if (pendingFile) {
        const url = await uploadAdminDocumentFile(pendingFile, docId);
        await updateAdminDocument(docId, { file_url: url });
        setFileUrl(url);
        setPendingFile(null);
      }

      try {
        await onFichePasseportChange?.(numero.trim(), expiration || null);
      } catch {
        /* fiche joueur : erreur déjà signalée par le parent */
      }
      toast(passeportDoc ? "Passeport mis à jour" : "Passeport enregistré", "success");
      setShowForm(false);
      setEditingPasseportId(docId);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur enregistrement", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddVisa() {
    if (!canManage) return;
    if (!numero.trim()) {
      toast("Enregistrez d'abord un numéro de passeport", "error");
      return;
    }
    setSaving(true);
    try {
      if (!passeportDoc) {
        await upsertOwnerPasseportDocument(ownerType, ownerId, {
          document_number: numero,
          expiration_date: expiration || null,
        });
      }
      const res = await createAdminDocument({
        owner_type: ownerType,
        owner_id: ownerId,
        document_type: "visa",
        document_number: "À compléter",
        country: "",
        expiration_date: null,
        file_url: null,
        notes: "Créé depuis la fiche — compléter dans Passeports & Visas",
      });
      if (res.error) {
        toast(res.error, "error");
        return;
      }
      toast("Visa brouillon créé — complétez-le dans Passeports & Visas", "success");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVisa(id: string) {
    if (!canManage) return;
    const res = await deleteAdminDocument(id);
    if (!res.ok) {
      toast(res.error ?? "Suppression impossible", "error");
      return;
    }
    toast("Visa supprimé", "success");
    await load();
  }

  if (loading) {
    return <p className="text-sm text-muted">Chargement des documents…</p>;
  }

  const displayNumero = passeportDoc?.document_number ?? passeportNumero ?? "—";
  const displayExpiration = formatDateFr(
    passeportDoc?.expiration_date ?? passeportExpiration
  );

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-[var(--text-primary)]">Passeport — {ownerLabel}</p>
          <p className="text-xs text-muted">
            Module central{" "}
            <Link href="/v2/passeports" className="text-frmt-green hover:underline">
              Passeports & Visas
            </Link>
          </p>
        </div>
        {canManage && !showForm && (
          <Button size="sm" className="gap-1" onClick={openNewPasseport}>
            <IdCard className="h-4 w-4" />
            {passeportDoc ? "Modifier le passeport" : "Insérer un passeport"}
          </Button>
        )}
      </div>

      {!showForm && (
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted">N° passeport (fiche)</dt>
            <dd className="font-medium">{displayNumero}</dd>
          </div>
          <div>
            <dt className="text-muted">Expiration</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{displayExpiration}</span>
              <DocumentExpirationBadge
                expirationDate={
                  passeportDoc?.expiration_date ?? passeportExpiration ?? null
                }
              />
            </dd>
          </div>
          {passeportDoc && (
            <>
              {passeportDoc.country && (
                <div>
                  <dt className="text-muted">Pays d&apos;émission</dt>
                  <dd>{passeportDoc.country}</dd>
                </div>
              )}
              {passeportDoc.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Notes</dt>
                  <dd className="whitespace-pre-wrap">{passeportDoc.notes}</dd>
                </div>
              )}
              {passeportDoc.file_url && (
                <div className="sm:col-span-2">
                  <dt className="text-muted mb-1">Scan</dt>
                  <dd>
                    <a
                      href={passeportDoc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-frmt-green hover:underline"
                    >
                      Voir le document
                    </a>
                  </dd>
                </div>
              )}
            </>
          )}
          {!passeportDoc && (passeportNumero || passeportExpiration) && (
            <p className="sm:col-span-2 text-xs text-amber-200/90">
              Données sur la fiche uniquement — utilisez « Insérer un passeport » pour les enregistrer dans
              Passeports & Visas.
            </p>
          )}
        </dl>
      )}

      {showForm && canManage && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-main)] p-4 space-y-3">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            {editingPasseportId ? "Modifier le passeport" : "Nouveau passeport"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>N° passeport *</Label>
              <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
            </div>
            <div>
              <Label>Date d&apos;expiration *</Label>
              <Input
                type="date"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Pays d&apos;émission</Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Maroc, France…"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <textarea
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <DocumentUpload
                label="Copie du passeport (PDF ou image)"
                hint="Joignez le scan ou la photo du passeport — saisie manuelle des informations ci-dessus."
                currentUrl={fileUrl}
                onUploaded={(url) => setFileUrl(url)}
                onUpload={async (file) => {
                  setPendingFile(file);
                  if (editingPasseportId) {
                    return uploadAdminDocumentFile(file, editingPasseportId);
                  }
                  return readFileAsDataUrl(file);
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={saving} onClick={() => void handleSavePasseport()}>
              {saving ? "Enregistrement…" : "Enregistrer le passeport"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setPendingFile(null);
              }}
            >
              Annuler
            </Button>
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border)] pt-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">Visas ({visaDocs.length})</p>
          {canManage && (
            <Button size="sm" variant="secondary" className="gap-1" disabled={saving} onClick={() => void handleAddVisa()}>
              <Plus className="h-3 w-3" /> Ajouter un visa
            </Button>
          )}
        </div>
        {visaDocs.length === 0 ? (
          <p className="text-xs text-muted">Aucun visa enregistré.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
            {visaDocs.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div>
                  <p className="font-medium">
                    {v.country || "Pays ?"} — {v.document_number ?? "—"}
                  </p>
                  <p className="text-xs text-muted">
                    Exp. {v.expiration_date ?? "—"}
                    <DocumentExpirationBadge expirationDate={v.expiration_date} className="ml-2" />
                  </p>
                </div>
                <div className="flex gap-1">
                  <Link href="/v2/passeports">
                    <Button size="sm" variant="ghost" title="Ouvrir dans Passeports & Visas">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                  {canManage && (
                    <Button size="sm" variant="danger" onClick={() => void handleDeleteVisa(v.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

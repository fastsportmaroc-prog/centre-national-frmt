"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { V2PageActions } from "@/components/v2/V2PageActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/v2/ui/EmptyState";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { DocumentExpirationBadge } from "@/components/v2/passeports/DocumentExpirationBadge";
import { OwnerPersonSearch, type OwnerSearchOption } from "@/components/v2/passeports/OwnerPersonSearch";
import { DocumentUpload } from "@/components/passeport/DocumentUpload";
import {
  computeAdminDocumentAlertStats,
  createAdminDocument,
  deleteAdminDocument,
  filterAdminDocuments,
  getAdminDocumentsEnriched,
  isAdminDocumentsSupabaseMode,
  updateAdminDocument,
} from "@/lib/data/admin-documents";
import { isBrowserSupabaseReady } from "@/lib/local-test/mode";
import { getEntraineurs, getJoueurs } from "@/lib/supabase/queries";
import { uploadAdminDocumentFile } from "@/lib/storage/upload-admin-document";
import { exportPasseportsPDF } from "@/lib/pdf/pdf-exports";
import type {
  AdminDocumentEnriched,
  AdminDocumentInput,
  AdminDocumentOwnerType,
  AdminDocumentType,
} from "@/lib/types/admin-document";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";
import {
  DOCUMENT_STATUS_LABELS,
  getDocumentExpirationStatus,
  type DocumentExpirationStatus,
} from "@/lib/utils/admin-document-status";
import { useDebounced } from "@/lib/hooks/useDebounced";
import { canManagePasseports } from "@/lib/auth/passeports-access";
import { useRole } from "@/lib/hooks/useRole";
import {
  formatJoueursCountLabel,
  joueurRoleBadgeClass,
  joueurRoleLabel,
  resolveJoueurSexe,
} from "@/lib/v2/joueur-sexe-display";
import { cn } from "@/lib/utils/cn";
import { Download, Eye, IdCard, Pencil, Trash2 } from "lucide-react";

type DocForm = {
  ownerKey: string;
  document_type: AdminDocumentType;
  document_number: string;
  country: string;
  expiration_date: string;
  notes: string;
  file_url: string | null;
};

const defaultForm = (): DocForm => ({
  ownerKey: "",
  document_type: "passeport",
  document_number: "",
  country: "",
  expiration_date: "",
  notes: "",
  file_url: null,
});

function parseOwnerKey(key: string): { owner_type: AdminDocumentOwnerType; owner_id: string } | null {
  const [type, id] = key.split(":");
  if ((type !== "player" && type !== "coach") || !id) return null;
  return { owner_type: type, owner_id: id };
}

function ownerKeyFromDoc(d: AdminDocumentEnriched): string {
  return `${d.owner_type}:${d.owner_id}`;
}

function docTypeLabel(t: AdminDocumentType): string {
  return t === "passeport" ? "Passeport" : "Visa";
}

export function PasseportsV2Client() {
  const { toast } = useToast();
  const { role } = useRole();
  const canManage = canManagePasseports(role);

  const [items, setItems] = useState<AdminDocumentEnriched[]>([]);
  const [joueurs, setJoueurs] = useState<JoueurV2[]>([]);
  const [entraineurs, setEntraineurs] = useState<EntraineurV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [filterRole, setFilterRole] = useState<"" | AdminDocumentOwnerType>("");
  const [filterDocType, setFilterDocType] = useState<"" | AdminDocumentType>("");
  const [filterStatus, setFilterStatus] = useState<"" | DocumentExpirationStatus>("");

  const [formOpen, setFormOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<AdminDocumentEnriched | null>(null);
  const [editTarget, setEditTarget] = useState<AdminDocumentEnriched | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDocumentEnriched | null>(null);
  const [form, setForm] = useState<DocForm>(() => defaultForm());
  const [saving, setSaving] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const supabaseMode = isAdminDocumentsSupabaseMode();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [docs, j, e] = await Promise.all([
        getAdminDocumentsEnriched(),
        getJoueurs(),
        getEntraineurs(),
      ]);
      setItems(docs);
      setJoueurs(j);
      setEntraineurs(e);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ownerSearchOptions = useMemo((): OwnerSearchOption[] => {
    const players: OwnerSearchOption[] = joueurs.map((j) => ({
      key: `player:${j.id}`,
      prenom: j.prenom,
      nom: j.nom,
      roleLabel: joueurRoleLabel(resolveJoueurSexe(j)),
    }));
    const coaches: OwnerSearchOption[] = entraineurs.map((e) => ({
      key: `coach:${e.id}`,
      prenom: e.prenom,
      nom: e.nom,
      roleLabel: "Entraîneur",
    }));
    return [...players, ...coaches].sort((a, b) =>
      `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)
    );
  }, [joueurs, entraineurs]);

  const filtered = useMemo(
    () =>
      filterAdminDocuments(items, {
        search: debouncedSearch,
        role: filterRole,
        docType: filterDocType,
        status: filterStatus,
      }),
    [items, debouncedSearch, filterRole, filterDocType, filterStatus]
  );

  const kpi = useMemo(() => computeAdminDocumentAlertStats(items), [items]);

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm());
    setPendingFile(null);
    setFormOpen(true);
  }

  function openEdit(d: AdminDocumentEnriched) {
    setEditTarget(d);
    setForm({
      ownerKey: ownerKeyFromDoc(d),
      document_type: d.document_type,
      document_number: d.document_number ?? "",
      country: d.country ?? "",
      expiration_date: d.expiration_date ?? "",
      notes: d.notes ?? "",
      file_url: d.file_url,
    });
    setPendingFile(null);
    setFormOpen(true);
  }

  async function handleSave() {
    const owner = parseOwnerKey(form.ownerKey);
    if (!owner) {
      toast("Sélectionnez un joueur ou un entraîneur", "error");
      return;
    }
    if (!form.document_number.trim()) {
      toast("Le numéro de document est obligatoire", "error");
      return;
    }
    if (form.document_type === "visa" && !form.country.trim()) {
      toast("Le pays du visa est obligatoire", "error");
      return;
    }

    setSaving(true);
    try {
      let docId = editTarget?.id ?? "";
      const payload: AdminDocumentInput = {
        owner_type: owner.owner_type,
        owner_id: owner.owner_id,
        document_type: form.document_type,
        document_number: form.document_number.trim(),
        country: form.document_type === "visa" ? form.country.trim() : null,
        expiration_date: form.expiration_date || null,
        file_url: form.file_url,
        notes: form.notes.trim() || null,
      };

      if (editTarget) {
        const res = await updateAdminDocument(editTarget.id, payload);
        if (res.error || !res.data) {
          toast(res.error ?? "Erreur mise à jour", "error");
          return;
        }
        docId = res.data.id;
        toast("Document mis à jour");
      } else {
        const res = await createAdminDocument(payload);
        if (res.error || !res.data) {
          toast(res.error ?? "Erreur création", "error");
          return;
        }
        docId = res.data.id;
        toast("Document ajouté");
      }

      if (pendingFile && docId) {
        const url = await uploadAdminDocumentFile(pendingFile, docId);
        await updateAdminDocument(docId, { file_url: url });
      }

      setFormOpen(false);
      setEditTarget(null);
      setPendingFile(null);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erreur enregistrement", "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await deleteAdminDocument(deleteTarget.id);
    if (!res.ok) {
      toast(res.error ?? "Suppression impossible", "error");
      return;
    }
    toast("Document supprimé");
    setDeleteTarget(null);
    if (viewDoc?.id === deleteTarget.id) setViewDoc(null);
    await load();
  }

  function exportPdf() {
    exportPasseportsPDF(
      filtered.map((d, i) => ({
        "#": String(i + 1),
        Nom: d.owner_nom,
        Prénom: d.owner_prenom,
        Rôle: d.owner_role_label,
        Type: docTypeLabel(d.document_type),
        Pays: d.country ?? "—",
        Numéro: d.document_number ?? "—",
        Expiration: d.expiration_date ?? "—",
        Statut: DOCUMENT_STATUS_LABELS[getDocumentExpirationStatus(d.expiration_date)],
      }))
    );
  }

  if (loading) {
    return (
      <main className="p-6">
        <p className="text-sm text-muted">Chargement des documents…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 space-y-3">
        <p className="text-sm text-red-400">{error}</p>
        <Button onClick={() => void load()}>Réessayer</Button>
      </main>
    );
  }

  return (
    <>
      <V2PageHeader
        title="Passeports & Visas"
        description="Documents liés aux joueurs et entraîneurs du centre"
        actions={
          <V2PageActions
            canAdd={canManage}
            onAdd={openCreate}
            onExportPdf={exportPdf}
            addLabel="Ajouter un document"
          />
        }
      />

      <main className="space-y-4 p-4 sm:p-6">
        {supabaseMode ? (
          <Card className="border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            Mode Supabase actif — données et fichiers stockés sur votre projet Supabase.
          </Card>
        ) : isBrowserSupabaseReady() ? (
          <Card className="border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            Connectez-vous (admin ou direction) pour enregistrer les documents dans Supabase.
          </Card>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="v2-kpi-card p-3">
            <p className="text-xs text-[var(--text-secondary)]">Passeports expirés</p>
            <p className="text-2xl font-bold text-red-400">{kpi.passeportsExpires}</p>
          </Card>
          <Card className="v2-kpi-card p-3">
            <p className="text-xs text-[var(--text-secondary)]">Passeports &lt; 6 mois</p>
            <p className="text-2xl font-bold text-amber-300">{kpi.passeportsExpiring6Months}</p>
          </Card>
          <Card className="v2-kpi-card p-3">
            <p className="text-xs text-[var(--text-secondary)]">Visas expirés</p>
            <p className="text-2xl font-bold text-red-400">{kpi.visasExpires}</p>
          </Card>
          <Card className="v2-kpi-card p-3">
            <p className="text-xs text-[var(--text-secondary)]">Visas &lt; 30 jours</p>
            <p className="text-2xl font-bold text-orange-300">{kpi.visasExpiring30Days}</p>
          </Card>
        </div>

        <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value as "" | AdminDocumentOwnerType)}>
            <option value="">Tous les rôles</option>
            <option value="player">Joueurs / joueuses</option>
            <option value="coach">Entraîneurs</option>
          </Select>
          <Select value={filterDocType} onChange={(e) => setFilterDocType(e.target.value as "" | AdminDocumentType)}>
            <option value="">Tous les types</option>
            <option value="passeport">Passeports</option>
            <option value="visa">Visas</option>
          </Select>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "" | DocumentExpirationStatus)}
          >
            <option value="">Tous les statuts</option>
            <option value="expire">Expirés</option>
            <option value="urgent">Urgents</option>
            <option value="a_renouveler">À renouveler</option>
            <option value="valide">Valides</option>
          </Select>
        </Card>

        {filtered.length === 0 ? (
          <EmptyState
            icon={IdCard}
            title="Aucun document"
            description={
              items.length === 0
                ? "Ajoutez un passeport ou un visa pour un joueur ou un entraîneur existant."
                : "Aucun élément ne correspond aux filtres."
            }
            actionLabel={canManage ? "Ajouter un document" : undefined}
            onAction={canManage ? openCreate : undefined}
          />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="v2-data-table w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-elevated text-left text-muted">
                  <th className="p-3">Nom</th>
                  <th className="p-3">Rôle</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Pays (visa)</th>
                  <th className="p-3">N° document</th>
                  <th className="p-3">Expiration</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Fichier</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr key={d.id} className={i % 2 === 1 ? "bg-surface-elevated/30" : ""}>
                    <td className="p-3 font-medium">
                      {d.owner_prenom} {d.owner_nom}
                    </td>
                    <td className="p-3">
                      {d.owner_type === "player" ? (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                            joueurRoleBadgeClass(
                              resolveJoueurSexe(
                                joueurs.find((j) => j.id === d.owner_id) ?? {}
                              )
                            )
                          )}
                        >
                          {d.owner_role_label}
                        </span>
                      ) : (
                        d.owner_role_label
                      )}
                    </td>
                    <td className="p-3">{docTypeLabel(d.document_type)}</td>
                    <td className="p-3">{d.document_type === "visa" ? d.country ?? "—" : "—"}</td>
                    <td className="p-3">{d.document_number ?? "—"}</td>
                    <td className="p-3">{d.expiration_date ?? "—"}</td>
                    <td className="p-3">
                      <DocumentExpirationBadge expirationDate={d.expiration_date} />
                    </td>
                    <td className="p-3">
                      {d.file_url ? (
                        <span className="text-xs text-[var(--success)]">Oui</span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Button variant="ghost" size="sm" title="Voir" onClick={() => setViewDoc(d)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {d.file_url && (
                          <a
                            href={d.file_url}
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-elevated hover:text-white"
                            title="Télécharger"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                        {canManage && (
                          <>
                            <Button variant="secondary" size="sm" title="Modifier" onClick={() => openEdit(d)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="danger" size="sm" title="Supprimer" onClick={() => setDeleteTarget(d)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <p className="text-xs text-muted">
          {formatJoueursCountLabel(joueurs)} · {entraineurs.length} entraîneur
          {entraineurs.length > 1 ? "s" : ""} — listes synchronisées depuis les modules
          existants.
        </p>
      </main>

      {/* Formulaire ajout / modification */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editTarget ? "Modifier le document" : "Ajouter un document"}
        footer={
          <Button onClick={() => void handleSave()} disabled={saving || !canManage}>
            {saving ? "Enregistrement…" : editTarget ? "Mettre à jour" : "Enregistrer"}
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {editTarget ? (
              <div className="space-y-1">
                <Label>Joueur ou entraîneur</Label>
                <p className="rounded-md border border-border bg-surface-elevated/50 px-3 py-2 text-sm">
                  {editTarget.owner_prenom} {editTarget.owner_nom} — {editTarget.owner_role_label}
                </p>
              </div>
            ) : (
              <OwnerPersonSearch
                value={form.ownerKey}
                options={ownerSearchOptions}
                onChange={(ownerKey) => setForm({ ...form, ownerKey })}
                required
                placeholder="Ex. Alaoui, Benali, Karim…"
              />
            )}
          </div>
          <div>
            <Label>Type de document *</Label>
            <Select
              value={form.document_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  document_type: e.target.value as AdminDocumentType,
                  country: e.target.value === "passeport" ? "" : form.country,
                })
              }
            >
              <option value="passeport">Passeport</option>
              <option value="visa">Visa</option>
            </Select>
          </div>
          <div>
            <Label>N° document *</Label>
            <Input
              value={form.document_number}
              onChange={(e) => setForm({ ...form, document_number: e.target.value })}
            />
          </div>
          {form.document_type === "visa" && (
            <div className="sm:col-span-2">
              <Label>Pays du visa *</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
          )}
          <div>
            <Label>Date d&apos;expiration</Label>
            <Input
              type="date"
              value={form.expiration_date}
              onChange={(e) => setForm({ ...form, expiration_date: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <textarea
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <DocumentUpload
              label={
                form.document_type === "passeport"
                  ? "Copie du passeport (PDF ou image)"
                  : "Fichier (PDF ou image)"
              }
              hint="Saisie manuelle des champs ci-dessus, puis joignez le document."
              currentUrl={form.file_url}
              onUploaded={(url) => setForm({ ...form, file_url: url })}
              onUpload={async (file) => {
                setPendingFile(file);
                if (editTarget) {
                  return uploadAdminDocumentFile(file, editTarget.id);
                }
                return readFileAsDataUrl(file);
              }}
            />
          </div>
        </div>
      </Modal>

      {/* Consultation */}
      <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title="Détail du document">
        {viewDoc && (
          <div className="space-y-4 text-sm">
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted">Personne</dt>
                <dd className="font-medium">
                  {viewDoc.owner_prenom} {viewDoc.owner_nom} ({viewDoc.owner_role_label})
                </dd>
              </div>
              <div>
                <dt className="text-muted">Type</dt>
                <dd>{docTypeLabel(viewDoc.document_type)}</dd>
              </div>
              <div>
                <dt className="text-muted">N° document</dt>
                <dd>{viewDoc.document_number ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Expiration</dt>
                <dd>{viewDoc.expiration_date ?? "—"}</dd>
              </div>
              {viewDoc.document_type === "visa" && (
                <div>
                  <dt className="text-muted">Pays</dt>
                  <dd>{viewDoc.country ?? "—"}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted">Statut</dt>
                <dd>
                  <DocumentExpirationBadge expirationDate={viewDoc.expiration_date} />
                </dd>
              </div>
            </dl>
            {viewDoc.notes && (
              <p className="rounded border border-border bg-surface-elevated/50 p-2 text-muted">{viewDoc.notes}</p>
            )}
            {viewDoc.file_url ? (
              <div className="space-y-2">
                {viewDoc.file_url.includes("application/pdf") ||
                viewDoc.file_url.toLowerCase().includes(".pdf") ? (
                  <a
                    href={viewDoc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-frmt-green hover:underline"
                  >
                    Ouvrir le PDF
                  </a>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={viewDoc.file_url}
                    alt="Document"
                    className="max-h-64 rounded border border-border object-contain"
                  />
                )}
                <div className="flex gap-2">
                  <a href={viewDoc.file_url} download target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm">
                      <Download className="h-4 w-4" /> Télécharger
                    </Button>
                  </a>
                  {canManage && (
                    <Button variant="secondary" size="sm" onClick={() => openEdit(viewDoc)}>
                      <Pencil className="h-4 w-4" /> Modifier
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted">Aucun fichier attaché.</p>
            )}
            <p className="text-xs text-muted">
              Profil :{" "}
              <Link
                href={
                  viewDoc.owner_type === "player"
                    ? `/v2/joueurs/${viewDoc.owner_id}`
                    : `/v2/entraineurs/${viewDoc.owner_id}`
                }
                className="text-frmt-green hover:underline"
              >
                Voir la fiche
              </Link>
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer le document"
        description={
          deleteTarget
            ? `Supprimer le ${docTypeLabel(deleteTarget.document_type)} de ${deleteTarget.owner_prenom} ${deleteTarget.owner_nom} ?`
            : ""
        }
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture fichier impossible"));
    reader.readAsDataURL(file);
  });
}

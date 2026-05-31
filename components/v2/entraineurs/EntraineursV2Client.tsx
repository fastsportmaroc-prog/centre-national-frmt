"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { V2PageActions } from "@/components/v2/V2PageActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Input";
import { PlayerAvatar } from "@/components/v2/ui/PlayerAvatar";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";
import { EmptyState } from "@/components/v2/ui/EmptyState";
import { useToast } from "@/components/v2/ui/ToastProvider";
import {
  createEntraineur,
  deleteEntraineur,
  getEntraineurById,
  getEntraineurs,
  getStageCoachLinks,
  updateEntraineur,
} from "@/lib/supabase/queries";
import { resolveOwnerPasseportForForm } from "@/lib/passeport/resolve-owner-passeport-form";
import { exportEntraineursPDF } from "@/lib/pdf/pdf-exports";
import { STATUTS_ENTRAINEUR } from "@/lib/constants/entraineurs";
import { useDebounced } from "@/lib/hooks/useDebounced";
import type { EntraineurV2 } from "@/lib/types/v2";
import { GraduationCap, LayoutGrid, List, Pencil, Trash2 } from "lucide-react";
import { useRole } from "@/lib/hooks/useRole";
import { upsertOwnerPasseportDocument } from "@/lib/passeport/upsert-owner-passeport";
import { uploadEntraineurPhoto } from "@/lib/storage/upload-entraineur-photo";
import { JoueurPhotoField } from "@/components/v2/joueurs/JoueurPhotoField";
import { resolveEntraineurPhotoUrl } from "@/lib/storage/entraineur-photo-cache";

type ViewMode = "list" | "grid";

type EntraineurForm = {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  specialite: string;
  passeport_numero: string;
  passeport_expiration: string;
  statut: string;
  notes: string;
};

const defaultForm = (): EntraineurForm => ({
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  specialite: "",
  passeport_numero: "",
  passeport_expiration: "",
  statut: "actif",
  notes: "",
});

function docsOk(e: EntraineurV2): boolean {
  return Boolean(e.passeport_numero?.trim() && e.passeport_expiration);
}

export function EntraineursV2Client() {
  const { toast } = useToast();
  const { canWrite, canDelete, role } = useRole();
  const canManage = canWrite || role === "viewer" || role === "direction";
  const canDeleteItems = canDelete || role === "viewer" || role === "direction";

  const [items, setItems] = useState<EntraineurV2[]>([]);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [statut, setStatut] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EntraineurV2 | null>(null);
  const [editTarget, setEditTarget] = useState<EntraineurV2 | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [form, setForm] = useState<EntraineurForm>(() => defaultForm());
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [loadingEditForm, setLoadingEditForm] = useState(false);
  const [registerPasseportModule, setRegisterPasseportModule] = useState(true);
  const [inlineEdits, setInlineEdits] = useState<
    Record<
      string,
      {
        telephone?: string;
        specialite?: string;
        passeport_numero?: string;
        passeport_expiration?: string;
        statut?: string;
      }
    >
  >({});
  const [savingInline, setSavingInline] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    const [e, links] = await Promise.all([getEntraineurs(), getStageCoachLinks()]);
    setItems(e);
    const counts: Record<string, number> = {};
    for (const l of links) counts[l.coach_id] = (counts[l.coach_id] ?? 0) + 1;
    setStageCounts(counts);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const specialites = useMemo(() => {
    const set = new Set<string>();
    for (const e of items) {
      if (e.specialite?.trim()) set.add(e.specialite.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          `${e.prenom} ${e.nom}`.toLowerCase().includes(q) ||
          (e.email ?? "").toLowerCase().includes(q) ||
          (e.passeport_numero ?? "").toLowerCase().includes(q)
      );
    }
    if (statut) list = list.filter((e) => (e.statut ?? "actif") === statut);
    if (specialite) list = list.filter((e) => (e.specialite ?? "") === specialite);
    list.sort((a, b) => a.nom.localeCompare(b.nom));
    return list;
  }, [items, debouncedSearch, statut, specialite]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filtered.some((e) => e.id === id)));
  }, [filtered]);

  function openCreate() {
    setEditTarget(null);
    setForm(defaultForm());
    setRegisterPasseportModule(true);
    setPhotoFile(null);
    setPhotoPreview(null);
    setOpen(true);
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function openEdit(e: EntraineurV2) {
    setEditTarget(e);
    setPhotoFile(null);
    setRegisterPasseportModule(true);
    setOpen(true);
    setLoadingEditForm(true);
    try {
      const fresh = (await getEntraineurById(e.id)) ?? e;
      const passport = await resolveOwnerPasseportForForm(
        "coach",
        e.id,
        fresh.passeport_numero,
        fresh.passeport_expiration
      );
      setPhotoPreview(resolveEntraineurPhotoUrl(e.id, fresh.photo_url));
      setForm({
        nom: fresh.nom ?? "",
        prenom: fresh.prenom ?? "",
        email: fresh.email ?? "",
        telephone: fresh.telephone ?? "",
        specialite: fresh.specialite ?? "",
        passeport_numero: passport.numero,
        passeport_expiration: passport.expiration,
        statut: fresh.statut ?? "actif",
        notes: fresh.notes ?? "",
      });
    } catch {
      toast("Impossible de charger la fiche complète", "error");
      setPhotoPreview(resolveEntraineurPhotoUrl(e.id, e.photo_url));
      setForm({
        nom: e.nom ?? "",
        prenom: e.prenom ?? "",
        email: e.email ?? "",
        telephone: e.telephone ?? "",
        specialite: e.specialite ?? "",
        passeport_numero: e.passeport_numero ?? "",
        passeport_expiration: e.passeport_expiration ?? "",
        statut: e.statut ?? "actif",
        notes: e.notes ?? "",
      });
    } finally {
      setLoadingEditForm(false);
    }
  }

  async function handleSave() {
    if (!form.nom.trim() || !form.prenom.trim()) {
      toast("Nom et prénom sont obligatoires", "error");
      return;
    }
    const payload: Partial<EntraineurV2> = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim() || null,
      telephone: form.telephone.trim() || null,
      specialite: form.specialite.trim() || null,
      passeport_numero: form.passeport_numero.trim() || null,
      passeport_expiration: form.passeport_expiration || null,
      statut: form.statut,
      notes: form.notes.trim() || null,
    };

    setSavingPhoto(true);
    try {
      let entraineurId: string | undefined = editTarget?.id;

      if (editTarget) {
        const res = await updateEntraineur(editTarget.id, payload);
        if (!res.ok) {
          toast(res.error ?? "Erreur mise à jour", "error");
          return;
        }
        entraineurId = editTarget.id;
        toast("Entraîneur mis à jour");
      } else {
        const { error, data } = await createEntraineur(payload);
        if (error) {
          toast(error, "error");
          return;
        }
        entraineurId = data?.id;
        toast("Entraîneur créé");
      }

      let savedPhotoUrl: string | null = null;
      if (entraineurId && photoFile) {
        const photoResult = await uploadEntraineurPhoto(photoFile, entraineurId);
        savedPhotoUrl = photoResult.url;
        if (photoResult.warning) {
          toast(photoResult.warning, "warning");
        } else if (!photoResult.photoUrlSaved) {
          toast("Photo uploadée mais non liée à la fiche", "warning");
        }
      }

      if (entraineurId && registerPasseportModule && form.passeport_numero.trim()) {
        const docRes = await upsertOwnerPasseportDocument("coach", entraineurId, {
          document_number: form.passeport_numero,
          expiration_date: form.passeport_expiration || null,
        });
        if (docRes.error) {
          toast(`Passeport module : ${docRes.error}`, "warning");
        }
      }

      if (entraineurId && savedPhotoUrl) {
        setItems((prev) =>
          prev.map((p) => (p.id === entraineurId ? { ...p, photo_url: savedPhotoUrl } : p))
        );
      }

      setOpen(false);
      setEditTarget(null);
      setForm(defaultForm());
      setPhotoFile(null);
      setPhotoPreview(null);
      await load();
    } finally {
      setSavingPhoto(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteEntraineur(deleteTarget.id);
    toast("Entraîneur supprimé");
    setDeleteTarget(null);
    await load();
  }

  async function confirmBulkDelete() {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await deleteEntraineur(id);
    }
    toast(`${selectedIds.length} entraîneur(s) supprimé(s)`);
    setSelectedIds([]);
    setBulkDeleteOpen(false);
    await load();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleSelectAllFiltered() {
    const ids = filtered.map((e) => e.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  }

  async function saveInlineField(
    entraineur: EntraineurV2,
    field: "telephone" | "specialite" | "passeport_numero" | "passeport_expiration" | "statut",
    value: string
  ) {
    const current = (entraineur[field] ?? "") as string;
    if ((current || "") === (value || "")) return;
    setSavingInline((s) => ({ ...s, [entraineur.id]: true }));
    const res = await updateEntraineur(entraineur.id, { [field]: value || null });
    setSavingInline((s) => ({ ...s, [entraineur.id]: false }));
    if (!res.ok) {
      toast(res.error ?? "Erreur sauvegarde rapide", "error");
      return;
    }
    setItems((prev) =>
      prev.map((p) => (p.id === entraineur.id ? ({ ...p, [field]: value || null } as EntraineurV2) : p))
    );
    toast("Mise à jour enregistrée", "success");
  }

  function exportPdf() {
    exportEntraineursPDF(
      filtered.map((e, i) => ({
        "#": String(i + 1),
        Nom: e.nom,
        Prénom: e.prenom,
        Spécialité: e.specialite ?? "—",
        Téléphone: e.telephone ?? "—",
        Email: e.email ?? "—",
        Passeport: e.passeport_numero ?? "—",
        Expiration: e.passeport_expiration ?? "—",
        "Stages assignés": String(stageCounts[e.id] ?? 0),
        Statut: e.statut ?? "actif",
      }))
    );
  }

  return (
    <>
      <V2PageHeader
        title={`Entraîneurs (${items.length})`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView(view === "list" ? "grid" : "list")}
              title={view === "list" ? "Vue grille" : "Vue liste"}
            >
              {view === "list" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </Button>
            <V2PageActions canAdd={canManage} onAdd={openCreate} onExportPdf={exportPdf} />
            {canDeleteItems && selectedIds.length > 0 && (
              <Button variant="danger" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                Supprimer sélection ({selectedIds.length})
              </Button>
            )}
          </div>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="">Statut — Tous</option>
            {STATUTS_ENTRAINEUR.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select value={specialite} onChange={(e) => setSpecialite(e.target.value)}>
            <option value="">Spécialité — Toutes</option>
            {specialites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Card>

        {filtered.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Aucun entraîneur"
            description="Créez un entraîneur ou modifiez les filtres."
            actionLabel="Ajouter un entraîneur"
            onAction={canManage ? openCreate : undefined}
          />
        ) : view === "grid" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((e) => (
              <Card key={e.id} className="card-premium p-4">
                {canDeleteItems && (
                  <div className="mb-2 flex justify-end">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(e.id)}
                      onChange={() => toggleSelect(e.id)}
                      aria-label={`Sélectionner ${e.prenom} ${e.nom}`}
                    />
                  </div>
                )}
                <Link href={`/v2/entraineurs/${e.id}`} className="flex flex-col items-center gap-2 text-center">
                  <PlayerAvatar
                    prenom={e.prenom}
                    nom={e.nom}
                    photoUrl={resolveEntraineurPhotoUrl(e.id, e.photo_url)}
                    categorie="Coach"
                    size="lg"
                  />
                  <p className="font-semibold">
                    {e.prenom} {e.nom}
                  </p>
                  <p className="text-xs text-muted">{e.specialite ?? "—"}</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2 text-[11px]">
                    <span>🎾 {stageCounts[e.id] ?? 0} stage(s)</span>
                  </div>
                  <StatusBadge statut={e.statut ?? "actif"} />
                </Link>
                <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
                  {canManage && (
                    <Button variant="secondary" size="sm" onClick={() => void openEdit(e)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                  {canDeleteItems && (
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(e)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="overflow-x-auto">
            <table className="v2-data-table w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-elevated text-left text-muted">
                  <th className="p-3">
                    {canDeleteItems && (
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && filtered.every((e) => selectedIds.includes(e.id))}
                        onChange={toggleSelectAllFiltered}
                        aria-label="Tout sélectionner"
                      />
                    )}
                  </th>
                  <th className="p-3" />
                  <th className="p-3">Nom</th>
                  <th className="p-3">Prénom</th>
                  <th className="p-3">Spécialité</th>
                  <th className="p-3">Stages</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => (
                  <tr
                    key={e.id}
                    className={`border-b border-border/50 ${i % 2 === 1 ? "bg-surface-elevated/30" : ""}`}
                  >
                    <td className="p-3">
                      {canDeleteItems && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(e.id)}
                          onChange={() => toggleSelect(e.id)}
                          aria-label={`Sélectionner ${e.prenom} ${e.nom}`}
                        />
                      )}
                    </td>
                    <td className="p-3">
                      <PlayerAvatar
                        prenom={e.prenom}
                        nom={e.nom}
                        photoUrl={resolveEntraineurPhotoUrl(e.id, e.photo_url)}
                        categorie="Coach"
                        size="sm"
                      />
                    </td>
                    <td className="p-3">
                      <Link href={`/v2/entraineurs/${e.id}`} className="font-medium hover:text-frmt-green">
                        {e.nom}
                      </Link>
                    </td>
                    <td className="p-3">{e.prenom}</td>
                    <td className="p-3">
                      {canManage ? (
                        <Input
                          value={inlineEdits[e.id]?.specialite ?? e.specialite ?? ""}
                          placeholder="Spécialité"
                          className="h-8 min-w-[7rem] text-xs"
                          disabled={!!savingInline[e.id]}
                          onChange={(ev) =>
                            setInlineEdits((s) => ({
                              ...s,
                              [e.id]: { ...(s[e.id] ?? {}), specialite: ev.target.value },
                            }))
                          }
                          onBlur={(ev) => {
                            void saveInlineField(e, "specialite", ev.target.value);
                          }}
                        />
                      ) : (
                        (e.specialite ?? "—")
                      )}
                    </td>
                    <td className="p-3">{stageCounts[e.id] ?? 0}</td>
                    <td className="p-3">
                      {canManage ? (
                        <Select
                          value={inlineEdits[e.id]?.statut ?? (e.statut ?? "actif")}
                          className="h-8 text-xs"
                          disabled={!!savingInline[e.id]}
                          onChange={(ev) => {
                            const next = ev.target.value;
                            setInlineEdits((s) => ({
                              ...s,
                              [e.id]: { ...(s[e.id] ?? {}), statut: next },
                            }));
                            void saveInlineField(e, "statut", next);
                          }}
                        >
                          {STATUTS_ENTRAINEUR.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <StatusBadge statut={e.statut ?? "actif"} />
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {canManage && (
                          <Button variant="secondary" size="sm" onClick={() => void openEdit(e)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteItems && (
                          <Button variant="danger" size="sm" onClick={() => setDeleteTarget(e)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editTarget ? "Modifier l'entraîneur" : "Ajouter un entraîneur"}
        footer={
          <Button
            onClick={() => void handleSave()}
            disabled={!form.nom.trim() || !form.prenom.trim() || savingPhoto || loadingEditForm}
          >
            {savingPhoto
              ? "Enregistrement…"
              : loadingEditForm
                ? "Chargement…"
                : editTarget
                  ? "Mettre à jour"
                  : "Enregistrer"}
          </Button>
        }
      >
        <div
          className={`grid gap-3 sm:grid-cols-2 ${loadingEditForm ? "pointer-events-none opacity-60" : ""}`}
        >
          {loadingEditForm && (
            <p className="sm:col-span-2 text-center text-xs text-muted">Chargement de la fiche…</p>
          )}
          <JoueurPhotoField
            prenom={form.prenom}
            nom={form.nom}
            categorie="Coach"
            photoPreview={photoPreview}
            onPhotoChange={onPhotoChange}
            passeportNumero={form.passeport_numero}
            passeportExpiration={form.passeport_expiration}
            personKind="entraineur"
          />
          <div>
            <Label>Prénom *</Label>
            <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          </div>
          <div>
            <Label>Nom *</Label>
            <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
          </div>
          <div>
            <Label>Spécialité</Label>
            <Input value={form.specialite} onChange={(e) => setForm({ ...form, specialite: e.target.value })} />
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
              {STATUTS_ENTRAINEUR.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>N° passeport</Label>
            <Input
              value={form.passeport_numero}
              onChange={(e) => setForm({ ...form, passeport_numero: e.target.value })}
              placeholder="Numéro de passeport"
            />
          </div>
          <div>
            <Label>Expiration passeport</Label>
            <Input
              type="date"
              value={form.passeport_expiration}
              onChange={(e) => setForm({ ...form, passeport_expiration: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Notes</Label>
            <textarea
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Remarques, références documents…"
            />
          </div>
          <div className="sm:col-span-2 space-y-2 rounded border border-[var(--border)] bg-[var(--bg-main)] p-3">
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={registerPasseportModule}
                onChange={(e) => setRegisterPasseportModule(e.target.checked)}
              />
              Enregistrer aussi dans{" "}
              <Link href="/v2/passeports" className="text-frmt-green hover:underline">
                Passeports & Visas
              </Link>{" "}
              (si un n° est saisi)
            </label>
            <p className="text-xs text-muted">
              Saisie manuelle du n° et de l&apos;expiration — copie du scan dans l&apos;onglet Documents de la fiche.
            </p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Supprimer l'entraîneur"
        description={
          deleteTarget
            ? `${deleteTarget.prenom} ${deleteTarget.nom} sera retiré de tous les stages associés.`
            : ""
        }
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Supprimer la sélection"
        description={`Cette action est irréversible. ${selectedIds.length} entraîneur(s) seront supprimé(s).`}
        onConfirm={() => void confirmBulkDelete()}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </>
  );
}

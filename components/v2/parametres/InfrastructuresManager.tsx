"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";
import { useToast } from "@/components/v2/ui/ToastProvider";
import {
  createInfrastructureAction,
  deleteInfrastructureAction,
  importInfrastructureToCatalogAction,
  setInfrastructureStatutAction,
  updateInfrastructureAction,
} from "@/lib/actions/infrastructure-actions";
import { loadInfrastructureCatalog } from "@/lib/data/infrastructure-catalog";
import { useAuth } from "@/components/auth/AuthProvider";
import type { InfrastructureCatalogItem } from "@/lib/infrastructures/catalog-merge";
import type {
  Infrastructure,
  InfrastructureInput,
  StatutInfrastructure,
  TypeInfrastructure,
} from "@/lib/types/infrastructures";

const emptyForm: InfrastructureInput = {
  nom: "",
  type: "terrain",
  surface: "terre_battue",
  capacite: 4,
  actif: true,
  statut: "disponible",
  notes: null,
};

const TYPE_LABELS: Record<TypeInfrastructure, string> = {
  terrain: "Terrain / court",
  emplacement_physique: "Espace physique",
  fitness: "Fitness",
  natation: "Natation",
  autre: "Autre",
};

function isTerrainInfrastructure(i: Pick<Infrastructure, "type">): boolean {
  const t = (i.type ?? "").toLowerCase();
  if (t.includes("court") || t.includes("tennis") || t === "terrain") return true;
  if (
    t.includes("fitness") ||
    t.includes("physique") ||
    t.includes("natation") ||
    t.includes("piscine") ||
    t.includes("gym")
  )
    return false;
  return t === "terrain";
}

type Filtre = "tous" | "terrains" | "espaces";

const SOURCE_LABELS: Partial<Record<InfrastructureCatalogItem["catalogSource"], string>> = {
  infrastructures: "Catalogue CNE",
  terrains: "Planning",
};

export function InfrastructuresManager() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<InfrastructureCatalogItem[]>([]);
  const [stats, setStats] = useState({ infrastructures: 0, terrainsOnly: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<InfrastructureInput>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items: rows, stats: s, error } = await loadInfrastructureCatalog();
      setItems(rows);
      setStats(s);
      if (error) toast(error, "error");
    } catch {
      toast("Impossible de charger les terrains et infrastructures.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    void load();
  }, [authLoading, user, load]);

  const filtered = useMemo(() => {
    if (filtre === "terrains") return items.filter(isTerrainInfrastructure);
    if (filtre === "espaces") return items.filter((i) => !isTerrainInfrastructure(i));
    return items;
  }, [items, filtre]);

  const editing = useMemo(
    () => items.find((i) => i.id === editingId) ?? null,
    [items, editingId]
  );

  function startAdd() {
    setEditingId(null);
    setShowForm(true);
    setForm(emptyForm);
  }

  async function handleImportOne(item: InfrastructureCatalogItem) {
    if (item.inCatalog) return;
    setSaving(true);
    try {
      const result = await importInfrastructureToCatalogAction(item.sourceId);
      if (!result.ok) {
        toast(result.error ?? "Import impossible", "error");
        return;
      }
      toast(`${item.nom} ajouté au catalogue.`, "success");
      await load();
    } finally {
      setSaving(false);
    }
  }

  function startEdit(i: InfrastructureCatalogItem) {
    setEditingId(i.id);
    setShowForm(true);
    setForm({
      nom: i.nom,
      type: i.type,
      surface: i.surface,
      capacite: i.capacite,
      actif: i.actif,
      statut: i.statut,
      notes: i.notes,
    });
  }

  function cancelForm() {
    setEditingId(null);
    setShowForm(false);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.nom.trim()) {
      toast("Le nom est obligatoire.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload: InfrastructureInput = {
        ...form,
        nom: form.nom.trim(),
        capacite: Math.max(1, form.capacite || 1),
      };
      const result = editingId
        ? await updateInfrastructureAction(editingId, payload)
        : await createInfrastructureAction(payload);
      if (!result.ok) {
        toast(result.error ?? "Erreur", "error");
        return;
      }
      toast(editingId ? "Infrastructure mise à jour." : "Infrastructure ajoutée.", "success");
      cancelForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      const result = await deleteInfrastructureAction(deleteId);
      if (!result.ok) {
        toast(result.error ?? "Suppression impossible", "error");
        return;
      }
      toast("Infrastructure supprimée.", "success");
      setDeleteId(null);
      if (editingId === deleteId) cancelForm();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function quickStatut(id: string, statut: StatutInfrastructure) {
    const result = await setInfrastructureStatutAction(id, statut);
    if (!result.ok) {
      toast(result.error ?? "Erreur", "error");
      return;
    }
    await load();
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">Terrains &amp; infrastructures</h2>
          <p className="mt-1 text-sm text-muted">
            Courts de tennis, salles fitness, natation et autres espaces — utilisés par le planning,
            les réservations et la création de stages.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={startAdd}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted">
        {stats.total} élément(s) affiché(s)
        {stats.infrastructures > 0 ? ` — ${stats.infrastructures} au catalogue` : ""}
        {stats.terrainsOnly > 0 ? `, ${stats.terrainsOnly} depuis le planning` : ""}
        .
      </p>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["tous", "Tous"],
            ["terrains", "Terrains / courts"],
            ["espaces", "Autres espaces"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={filtre === id ? "primary" : "secondary"}
            onClick={() => setFiltre(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {showForm && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-4 space-y-3">
          <p className="text-sm font-medium">
            {editing ? `Modifier : ${editing.nom}` : "Nouvelle infrastructure"}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <Label>Nom</Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                placeholder="Court 1, Salle fitness…"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as TypeInfrastructure }))
                }
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Surface</Label>
              <Select
                value={form.surface}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    surface: e.target.value as InfrastructureInput["surface"],
                  }))
                }
              >
                <option value="terre_battue">Terre battue</option>
                <option value="dur">Dur</option>
                <option value="indoor">Indoor</option>
                <option value="exterieur">Extérieur</option>
                <option value="autre">Autre</option>
              </Select>
            </div>
            <div>
              <Label>Capacité</Label>
              <Input
                type="number"
                min={1}
                value={form.capacite}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacite: Number(e.target.value) || 1 }))
                }
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select
                value={form.statut}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    statut: e.target.value as StatutInfrastructure,
                  }))
                }
              >
                <option value="disponible">Disponible</option>
                <option value="occupe">Occupé</option>
                <option value="maintenance">Maintenance</option>
                <option value="ferme">Fermé</option>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Enregistrement…" : editingId ? "Mettre à jour" : "Créer"}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelForm}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-muted">
              <th className="p-3">Nom</th>
              <th className="p-3">Source</th>
              <th className="p-3">Type</th>
              <th className="p-3">Surface</th>
              <th className="p-3">Cap.</th>
              <th className="p-3">Statut</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-4 text-muted">
                  Chargement…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-muted">
                  Aucune infrastructure pour ce filtre.
                </td>
              </tr>
            ) : (
              filtered.map((i) => (
                <tr key={`${i.catalogSource}-${i.id}`} className="border-b border-[var(--border)]/50">
                  <td className="p-3 font-medium">
                    {i.nom}
                    {isTerrainInfrastructure(i) && (
                      <Badge variant="muted" className="ml-2 text-xs">
                        Court
                      </Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant={i.inCatalog ? "success" : "warning"} className="text-xs">
                      {SOURCE_LABELS[i.catalogSource] ?? "Catalogue CNE"}
                    </Badge>
                  </td>
                  <td className="p-3">{TYPE_LABELS[i.type] ?? i.type}</td>
                  <td className="p-3 capitalize">{i.surface.replaceAll("_", " ")}</td>
                  <td className="p-3">{i.capacite}</td>
                  <td className="p-3">
                    <Badge
                      variant={
                        i.statut === "disponible"
                          ? "success"
                          : i.statut === "maintenance"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {i.statut}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      {i.inCatalog ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            title="Modifier"
                            onClick={() => startEdit(i)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => void quickStatut(i.id, "maintenance")}
                          >
                            Maint.
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            title="Supprimer"
                            onClick={() => setDeleteId(i.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={saving}
                          title="Ajouter au catalogue pour modifier"
                          onClick={() => void handleImportOne(i)}
                        >
                          Synchroniser
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Supprimer cette infrastructure ?"
        description="Les réservations liées seront supprimées. Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={() => void confirmDelete()}
        loading={saving}
        onCancel={() => setDeleteId(null)}
      />
    </Card>
  );
}

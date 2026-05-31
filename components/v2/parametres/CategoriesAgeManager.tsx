"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { isOfficialCategoryCode } from "@/lib/constants/official-categories";
import {
  createAgeCategory,
  getDefaultAgeCategories,
  mergeBirthYearCategories,
  normalizeCategoryCode,
  resetAgeCategories,
} from "@/lib/v2/categories-age-store";
import { useAgeCategories } from "@/lib/hooks/useAgeCategories";
import type { AgeCategoryDefinition } from "@/lib/types/categories-age";
import { ConfirmDialog } from "@/components/v2/ui/ConfirmDialog";

export function CategoriesAgeManager() {
  const { categories, persist } = useAgeCategories();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    maxAge: "" as string,
    birthYear: "" as string,
    label: "",
  });
  const [yearFrom, setYearFrom] = useState(String(new Date().getFullYear() - 18));
  const [yearTo, setYearTo] = useState(String(new Date().getFullYear() - 8));
  const [error, setError] = useState<string | null>(null);

  const editing = useMemo(
    () => categories.find((c) => c.id === editingId) ?? null,
    [categories, editingId]
  );

  function startAdd() {
    setEditingId(null);
    setShowForm(true);
    setForm({ code: "", maxAge: "", birthYear: "", label: "" });
    setError(null);
  }

  function startEdit(c: AgeCategoryDefinition) {
    setEditingId(c.id);
    setShowForm(true);
    setForm({
      code: c.code,
      maxAge: c.maxAge != null ? String(c.maxAge) : "",
      birthYear: c.birthYear != null ? String(c.birthYear) : "",
      label: c.label,
    });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setShowForm(false);
    setForm({ code: "", maxAge: "", birthYear: "", label: "" });
    setError(null);
  }

  function handleSave() {
    const code = normalizeCategoryCode(form.code);
    if (!code) {
      setError("Le code est obligatoire (ex. U10, Elite Pro ou année 2012).");
      return;
    }
    const maxAgeRaw = form.maxAge.trim();
    const birthYearRaw = form.birthYear.trim();
    const maxAge =
      maxAgeRaw === "" ? null : Math.max(1, parseInt(maxAgeRaw, 10) || 0);
    const birthYear =
      birthYearRaw === "" ? null : Math.max(1900, parseInt(birthYearRaw, 10) || 0);
    if (!isOfficialCategoryCode(birthYear != null ? String(birthYear) : code)) {
      setError(
        "Codes autorisés : U8, U10, U12, U14, U16, U18, Elite Pro ou une année de naissance (ex. 2012)."
      );
      return;
    }
    if (maxAgeRaw !== "" && (maxAge == null || maxAge < 1)) {
      setError("Âge max invalide.");
      return;
    }
    if (birthYearRaw !== "" && (birthYear == null || birthYear < 1900)) {
      setError("Année de naissance invalide.");
      return;
    }
    if (birthYear != null && maxAge != null) {
      setError("Renseignez soit l'âge max (U10…), soit l'année de naissance, pas les deux.");
      return;
    }

    const duplicate = categories.some(
      (c) => c.code.toLowerCase() === code.toLowerCase() && c.id !== editingId
    );
    if (duplicate) {
      setError(`La catégorie « ${code} » existe déjà.`);
      return;
    }

    const kind =
      birthYear != null ? "birthYear" : maxAge != null ? "age" : ("label" as const);

    if (editingId) {
      persist(
        categories.map((c) =>
          c.id === editingId
            ? {
                ...c,
                code,
                kind,
                maxAge: kind === "birthYear" ? null : maxAge,
                birthYear,
                label: form.label.trim() || c.label,
                sortOrder: birthYear ?? maxAge ?? c.sortOrder,
              }
            : c
        )
      );
    } else {
      persist([
        ...categories,
        createAgeCategory({
          code: birthYear != null ? String(birthYear) : code,
          maxAge: kind === "birthYear" ? null : maxAge,
          birthYear,
          kind,
          label: form.label.trim() || undefined,
        }),
      ]);
    }
    cancelEdit();
  }

  function confirmDelete() {
    if (!deleteId) return;
    persist(categories.filter((c) => c.id !== deleteId));
    setDeleteId(null);
    if (editingId === deleteId) cancelEdit();
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">Catégories d&apos;âge &amp; stages</h2>
          <p className="mt-1 text-sm text-muted">
            Règle UN : âge révolu au 1<sup>er</sup> janvier strictement inférieur au chiffre de la
            catégorie (11 ans → U12, 13 → U14, 15 → U16, 17 → U18). Les groupes par année de
            naissance servent uniquement aux listes Groupes, pas à la catégorie joueur.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={startAdd}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1"
            onClick={() => {
              resetAgeCategories();
              persist(getDefaultAgeCategories());
            }}
          >
            <RotateCcw className="h-4 w-4" /> Réinitialiser
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/30 p-4">
        <p className="text-sm font-medium">Groupes par année de naissance</p>
        <p className="mt-1 text-xs text-muted">
          Crée une entrée par année (2010, 2011, 2012…) utilisable dans Groupes et l&apos;affectation
          automatique des joueurs.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <Label>De</Label>
            <Input
              inputMode="numeric"
              className="w-24"
              value={yearFrom}
              onChange={(e) => setYearFrom(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div>
            <Label>À</Label>
            <Input
              inputMode="numeric"
              className="w-24"
              value={yearTo}
              onChange={(e) => setYearTo(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const from = parseInt(yearFrom, 10);
              const to = parseInt(yearTo, 10);
              if (!from || !to) {
                setError("Indiquez une plage d'années valide.");
                return;
              }
              persist(mergeBirthYearCategories(categories, from, to));
              setError(null);
            }}
          >
            Générer les années
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-[var(--bg-elevated)] text-[var(--text-muted)]">
            <tr>
              <th className="p-2 font-medium">Code</th>
              <th className="p-2 font-medium">Libellé</th>
              <th className="p-2 font-medium">Âge max</th>
              <th className="p-2 font-medium">Année naiss.</th>
              <th className="p-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-[var(--border)]">
                <td className="p-2 font-medium">{c.code}</td>
                <td className="p-2 text-[var(--text-secondary)]">{c.label}</td>
                <td className="p-2">
                  {c.maxAge != null ? (
                    <span className="text-[var(--text-secondary)]">&lt; {c.maxAge} ans</span>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td className="p-2">
                  {c.birthYear != null ? (
                    <span className="text-[var(--text-secondary)]">{c.birthYear}</span>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td className="p-2 text-right">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mr-1 inline-flex gap-1"
                    onClick={() => startEdit(c)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="inline-flex gap-1 text-red-400"
                    onClick={() => setDeleteId(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg border border-dashed border-[var(--border)] p-4">
          <p className="text-sm font-medium">{editing ? "Modifier la catégorie" : "Nouvelle catégorie"}</p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Code *</Label>
              <Input
                placeholder="U10, Elite Pro ou 2012…"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>
            <div>
              <Label>Âge maximum (strictement moins de)</Label>
              <Input
                inputMode="numeric"
                placeholder="10 pour U10…"
                value={form.maxAge}
                onChange={(e) =>
                  setForm({ ...form, maxAge: e.target.value.replace(/\D/g, ""), birthYear: "" })
                }
              />
              <p className="mt-1 text-xs text-muted">Pour U10, U12… Laisser vide si groupe par année.</p>
            </div>
            <div>
              <Label>Année de naissance (groupe)</Label>
              <Input
                inputMode="numeric"
                placeholder="2012"
                value={form.birthYear}
                onChange={(e) => {
                  const birthYear = e.target.value.replace(/\D/g, "");
                  setForm({
                    ...form,
                    birthYear,
                    maxAge: birthYear ? "" : form.maxAge,
                    code: birthYear || form.code,
                  });
                }}
              />
              <p className="mt-1 text-xs text-muted">Ex. 2012 → tous les joueurs nés en 2012.</p>
            </div>
            <div className="sm:col-span-2">
              <Label>Libellé affiché</Label>
              <Input
                placeholder="Auto si vide (ex. U10 — moins de 10 ans)"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleSave}>
              {editing ? "Enregistrer" : "Créer"}
            </Button>
            <Button type="button" variant="secondary" onClick={cancelEdit}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Supprimer cette catégorie ?"
        description="Les stages ou joueurs déjà enregistrés conservent l'ancien code. Seules les listes déroulantes seront mises à jour."
        confirmLabel="Supprimer"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Card>
  );
}

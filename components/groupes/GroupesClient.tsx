"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Textarea } from "@/components/ui/Input";
import {
  countJoueursInGroupe,
  createGroupe,
  deleteGroupe,
  getGroupes,
  updateGroupe,
} from "@/lib/data/groupes";
import type { Groupe, GroupeInput } from "@/lib/types/database";
import { GROUPES_PREDEFINIS } from "@/lib/constants/joueurs";
import { Pencil, Plus, Trash2, Users } from "lucide-react";

const empty: GroupeInput = { nom: "", description: "", couleur: "#c8f542" };

export function GroupesClient() {
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Groupe | null>(null);
  const [form, setForm] = useState<GroupeInput>(empty);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const g = await getGroupes();
    setGroupes(g);
    const c: Record<string, number> = {};
    await Promise.all(
      g.map(async (gr) => {
        c[gr.id] = await countJoueursInGroupe(gr.id);
      })
    );
    setCounts(c);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate(nom?: string) {
    setEditing(null);
    setForm({ ...empty, nom: nom ?? "" });
    setError(null);
    setOpen(true);
  }

  function openEdit(g: Groupe) {
    setEditing(g);
    setForm({
      nom: g.nom,
      description: g.description ?? "",
      couleur: g.couleur ?? "#c8f542",
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editing) await updateGroupe(editing.id, form);
      else await createGroupe(form);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce groupe ? Les joueurs seront désaffectés.")) return;
    await deleteGroupe(id);
    await load();
  }

  return (
    <>
      <PageHeader
        title="Groupes"
        description="Organisation des joueurs par groupes d'entraînement"
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex justify-end">
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Créer un groupe
          </Button>
        </div>

        <Card>
          <p className="mb-3 text-sm text-muted">Groupes suggérés (création rapide)</p>
          <div className="flex flex-wrap gap-2">
            {GROUPES_PREDEFINIS.map((nom) => (
              <Button
                key={nom}
                variant="secondary"
                size="sm"
                onClick={() => openCreate(nom)}
                disabled={groupes.some((g) => g.nom === nom)}
              >
                {nom}
              </Button>
            ))}
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groupes.map((g) => (
            <Card key={g.id} className="relative">
              <div
                className="mb-3 h-1 w-full rounded-full"
                style={{ backgroundColor: g.couleur ?? "#c8f542" }}
              />
              <h3 className="text-lg font-semibold">{g.nom}</h3>
              <p className="mt-1 text-sm text-muted line-clamp-2">
                {g.description ?? "—"}
              </p>
              <p className="mt-3 flex items-center gap-1 text-sm text-tennis">
                <Users className="h-4 w-4" />
                {counts[g.id] ?? 0} joueur{(counts[g.id] ?? 0) !== 1 ? "s" : ""}
              </p>
              <Link
                href={`/joueurs?groupe=${g.id}`}
                className="mt-2 inline-block text-xs text-muted hover:text-tennis"
              >
                Voir les joueurs →
              </Link>
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(g)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(g.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier le groupe" : "Nouveau groupe"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="couleur">Couleur</Label>
            <Input
              id="couleur"
              type="color"
              value={form.couleur ?? "#c8f542"}
              onChange={(e) => setForm({ ...form, couleur: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">{editing ? "Enregistrer" : "Créer"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

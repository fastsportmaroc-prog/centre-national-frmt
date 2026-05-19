"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Select } from "@/components/ui/Input";
import {
  CHAMBRES_PAR_PAVILLON,
  PAVILLONS,
  TYPES_CHAMBRE,
} from "@/lib/constants/hebergement";
import {
  createHebergement,
  deleteHebergement,
  getHebergements,
  updateHebergement,
} from "@/lib/data/hebergements";
import type { Hebergement, HebergementInput, TypeChambreHebergement } from "@/lib/types/database";
import { groupHebergementsByPavillon } from "@/lib/utils/hebergement";
import { Pencil, Plus, Trash2 } from "lucide-react";

function emptyForm(pavillon = 1): HebergementInput {
  return {
    pavillon,
    numero_chambre: 1,
    type_chambre_code: "double",
    type_chambre: "Double",
    capacite: 2,
    occupe: false,
  };
}

export function HebergementClient() {
  const [items, setItems] = useState<Hebergement[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Hebergement | null>(null);
  const [form, setForm] = useState<HebergementInput>(emptyForm());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setItems(await getHebergements());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byPavillon = useMemo(() => groupHebergementsByPavillon(items), [items]);

  const stats = useMemo(() => {
    const occupees = items.filter((h) => h.occupe).length;
    return { total: items.length, occupees, libres: items.length - occupees };
  }, [items]);

  function openCreate(pavillon?: number) {
    setEditing(null);
    setForm(emptyForm(pavillon ?? 1));
    setError(null);
    setOpen(true);
  }

  function openEdit(h: Hebergement) {
    setEditing(h);
    setForm({
      pavillon: h.pavillon,
      numero_chambre: h.numero_chambre,
      type_chambre_code: h.type_chambre_code,
      type_chambre: h.type_chambre,
      capacite: h.capacite,
      occupe: h.occupe,
    });
    setError(null);
    setOpen(true);
  }

  function onTypeChange(code: TypeChambreHebergement) {
    const t = TYPES_CHAMBRE.find((x) => x.value === code)!;
    setForm({
      ...form,
      type_chambre_code: code,
      type_chambre: t.label,
      capacite: t.capacite,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editing) await updateHebergement(editing.id, form);
      else await createHebergement(form);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleDelete(h: Hebergement) {
    if (!confirm(`Supprimer ${h.nom_chambre} ?`)) return;
    await deleteHebergement(h.id);
    await load();
  }

  return (
    <>
      <PageHeader
        title="Hébergement"
        description={`${PAVILLONS.length} pavillons · ${CHAMBRES_PAR_PAVILLON} chambres par pavillon (Simple / Double / Triple)`}
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Card className="flex-1 min-w-[140px] p-4">
            <p className="text-sm text-muted">Chambres</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </Card>
          <Card className="flex-1 min-w-[140px] p-4">
            <p className="text-sm text-muted">Occupées</p>
            <p className="text-2xl font-semibold text-amber-400">{stats.occupees}</p>
          </Card>
          <Card className="flex-1 min-w-[140px] p-4">
            <p className="text-sm text-muted">Libres</p>
            <p className="text-2xl font-semibold text-frmt-green">{stats.libres}</p>
          </Card>
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Ajouter une chambre
          </Button>
        </div>

        {PAVILLONS.map((pavillon) => {
          const chambres = byPavillon.get(pavillon) ?? [];
          return (
            <section key={pavillon}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-frmt-green">
                  Pavillon {pavillon}
                  <span className="ml-2 text-sm font-normal text-muted">
                    ({chambres.length} chambre{chambres.length > 1 ? "s" : ""})
                  </span>
                </h2>
                <Button size="sm" variant="secondary" onClick={() => openCreate(pavillon)}>
                  <Plus className="h-4 w-4" />
                  Chambre
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {chambres.map((h) => (
                  <Card key={h.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">Ch. {h.numero_chambre}</h3>
                        <p className="text-xs text-muted">{h.type_chambre}</p>
                      </div>
                      <Badge variant={h.occupe ? "warning" : "success"}>
                        {h.occupe ? "Occupée" : "Libre"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted">Capacité : {h.capacite} pers.</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(h)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleDelete(h)}>
                        <Trash2 className="h-3 w-3 text-red-400" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier la chambre" : "Nouvelle chambre"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pavillon">Pavillon</Label>
              <Select
                id="pavillon"
                value={String(form.pavillon)}
                onChange={(e) =>
                  setForm({ ...form, pavillon: Number(e.target.value) })
                }
              >
                {PAVILLONS.map((p) => (
                  <option key={p} value={p}>
                    Pavillon {p}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="numero">N° chambre</Label>
              <Input
                id="numero"
                type="number"
                min={1}
                max={99}
                required
                value={form.numero_chambre}
                onChange={(e) =>
                  setForm({ ...form, numero_chambre: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div>
            <Label htmlFor="type">Type</Label>
            <Select
              id="type"
              value={form.type_chambre_code}
              onChange={(e) => onTypeChange(e.target.value as TypeChambreHebergement)}
            >
              {TYPES_CHAMBRE.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} ({t.capacite} pers.)
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.occupe}
              onChange={(e) => setForm({ ...form, occupe: e.target.checked })}
            />
            Chambre occupée
          </label>
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

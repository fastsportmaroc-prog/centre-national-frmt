"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import {
  createCourt,
  deleteCourt,
  getCourtsWithStats,
  getReservationsByCourt,
  updateCourt,
} from "@/lib/data/courts";
import type { Court, CourtInput, CourtWithStats, Reservation } from "@/lib/types/database";
import { SURFACES_COURT, STATUTS_COURT } from "@/lib/constants/joueurs";
import { formatDateTime } from "@/lib/utils/dates";
import { Pencil, Plus, Trash2, History } from "lucide-react";

const empty: CourtInput = {
  nom: "",
  surface: "Terre battue",
  couvert: false,
  eclairage: false,
  actif: true,
  statut: "disponible",
  maintenance_jusquau: null,
  notes: null,
};

function statutBadge(statut: Court["statut"]) {
  const map = {
    disponible: "success" as const,
    occupe: "warning" as const,
    maintenance: "warning" as const,
    ferme: "danger" as const,
  };
  return map[statut];
}

export function CourtsClient() {
  const [courts, setCourts] = useState<CourtWithStats[]>([]);
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Reservation[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [editing, setEditing] = useState<Court | null>(null);
  const [form, setForm] = useState<CourtInput>(empty);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setCourts(await getCourtsWithStats());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function openEdit(c: Court) {
    setEditing(c);
    setForm({
      nom: c.nom,
      surface: c.surface,
      couvert: c.couvert,
      eclairage: c.eclairage,
      actif: c.actif,
      statut: c.statut,
      maintenance_jusquau: c.maintenance_jusquau,
      notes: c.notes,
    });
    setOpen(true);
  }

  async function openHistory(c: Court) {
    setSelectedCourt(c);
    setHistory(await getReservationsByCourt(c.id));
    setHistoryOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (editing) await updateCourt(editing.id, form);
      else await createCourt(form);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce court ? Les réservations liées seront supprimées.")) return;
    await deleteCourt(id);
    await load();
  }

  return (
    <>
      <PageHeader
        title="Courts"
        description="Gestion des courts — statuts, maintenance et occupation"
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Ajouter un court
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courts.map((c) => (
            <Card key={c.id}>
              <div className="mb-3 flex items-start justify-between">
                <h3 className="text-lg font-semibold">{c.nom}</h3>
                <Badge variant={statutBadge(c.statut)}>
                  {STATUTS_COURT.find((s) => s.value === c.statut)?.label}
                </Badge>
              </div>
              <p className="text-sm text-muted">Surface : {c.surface}</p>
              <p className="text-sm text-muted">
                {c.couvert ? "Couvert" : "Extérieur"} ·{" "}
                {c.eclairage ? "Éclairage" : "Sans éclairage"}
              </p>
              {c.statut === "maintenance" && c.maintenance_jusquau && (
                <p className="mt-1 text-xs text-amber-400">
                  Maintenance jusqu&apos;au {formatDateTime(c.maintenance_jusquau)}
                </p>
              )}
              {c.notes && (
                <p className="mt-2 text-xs text-muted">{c.notes}</p>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <div className="text-sm">
                  <span className="text-tennis font-semibold">{c.taux_occupation}%</span>
                  <span className="text-muted"> occupation aujourd&apos;hui</span>
                  <p className="text-xs text-muted">{c.reservations_count} réservation(s)</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openHistory(c)}>
                    <History className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier le court" : "Nouveau court"}
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
            <Label>Surface</Label>
            <Select
              value={form.surface}
              onChange={(e) => setForm({ ...form, surface: e.target.value })}
            >
              {SURFACES_COURT.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Statut</Label>
            <Select
              value={form.statut}
              onChange={(e) =>
                setForm({ ...form, statut: e.target.value as CourtInput["statut"] })
              }
            >
              {STATUTS_COURT.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          {form.statut === "maintenance" && (
            <div>
              <Label>Maintenance jusqu&apos;au</Label>
              <Input
                type="datetime-local"
                value={
                  form.maintenance_jusquau
                    ? form.maintenance_jusquau.slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    maintenance_jusquau: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
              />
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.couvert}
                onChange={(e) => setForm({ ...form, couvert: e.target.checked })}
              />
              Couvert
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.eclairage}
                onChange={(e) => setForm({ ...form, eclairage: e.target.checked })}
              />
              Éclairage
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.actif}
                onChange={(e) => setForm({ ...form, actif: e.target.checked })}
              />
              Actif
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">{editing ? "Enregistrer" : "Créer"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`Historique — ${selectedCourt?.nom ?? ""}`}
      >
        {history.length === 0 ? (
          <p className="text-sm text-muted">Aucune réservation enregistrée.</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
            {history.map((r) => (
              <li key={r.id} className="rounded-lg border border-border px-3 py-2">
                <p>{formatDateTime(r.date_debut)} → {formatDateTime(r.date_fin)}</p>
                <Badge variant={r.statut === "annulee" ? "muted" : "success"}>
                  {r.statut}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}

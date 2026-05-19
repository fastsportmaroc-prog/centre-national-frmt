"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { getCourts } from "@/lib/data/courts";
import { getJoueurs } from "@/lib/data/joueurs";
import {
  cancelReservation,
  createReservation,
  deleteReservation,
  getReservations,
  getReservationsWithRelations,
  updateReservation,
} from "@/lib/data/reservations";
import { SmartReservationPanel } from "@/components/reservations/SmartReservationPanel";
import { ReservationsInfraPanel } from "@/components/reservations/ReservationsInfraPanel";
import { STATUTS_RESERVATION } from "@/lib/constants/joueurs";
import type {
  Court,
  Joueur,
  Reservation,
  ReservationInput,
  ReservationWithRelations,
} from "@/lib/types/database";
import { formatDateTime } from "@/lib/utils/dates";
import { Pencil, Plus, Trash2, XCircle } from "lucide-react";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statutLabel(s: Reservation["statut"]) {
  return STATUTS_RESERVATION.find((x) => x.value === s)?.label ?? s;
}

function statutVariant(s: Reservation["statut"]) {
  if (s === "confirmee") return "success" as const;
  if (s === "en_attente") return "warning" as const;
  if (s === "terminee") return "muted" as const;
  return "muted" as const;
}

type FormState = {
  joueur_id: string;
  court_id: string;
  date_debut: string;
  date_fin: string;
  statut: ReservationInput["statut"];
  notes: string;
};

export function ReservationsClient() {
  const [items, setItems] = useState<ReservationWithRelations[]>([]);
  const [rawReservations, setRawReservations] = useState<Reservation[]>([]);
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>("");
  const [filterCourt, setFilterCourt] = useState<string>("");
  const [form, setForm] = useState<FormState>({
    joueur_id: "",
    court_id: "",
    date_debut: "",
    date_fin: "",
    statut: "confirmee",
    notes: "",
  });

  const load = useCallback(async () => {
    const [res, raw, j, c] = await Promise.all([
      getReservationsWithRelations(),
      getReservations(),
      getJoueurs(),
      getCourts(),
    ]);
    setItems(res);
    setRawReservations(raw);
    setJoueurs(j);
    setCourts(c.filter((x) => x.actif && x.statut !== "ferme"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (filterStatut && r.statut !== filterStatut) return false;
      if (filterCourt && r.court_id !== filterCourt) return false;
      return true;
    });
  }, [items, filterStatut, filterCourt]);

  function defaultTimes() {
    const start = new Date();
    start.setHours(10, 0, 0, 0);
    const end = new Date();
    end.setHours(12, 0, 0, 0);
    return {
      date_debut: toLocalInput(start.toISOString()),
      date_fin: toLocalInput(end.toISOString()),
    };
  }

  function openCreate() {
    setEditingId(null);
    const times = defaultTimes();
    setForm({
      joueur_id: joueurs[0]?.id ?? "",
      court_id: courts[0]?.id ?? "",
      ...times,
      statut: "confirmee",
      notes: "",
    });
    setError(null);
    setOpen(true);
  }

  function openEdit(r: ReservationWithRelations) {
    setEditingId(r.id);
    setForm({
      joueur_id: r.joueur_id,
      court_id: r.court_id,
      date_debut: toLocalInput(r.date_debut),
      date_fin: toLocalInput(r.date_fin),
      statut: r.statut,
      notes: r.notes ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: ReservationInput = {
      joueur_id: form.joueur_id,
      court_id: form.court_id,
      date_debut: new Date(form.date_debut).toISOString(),
      date_fin: new Date(form.date_fin).toISOString(),
      statut: form.statut,
      notes: form.notes || null,
    };
    try {
      if (editingId) await updateReservation(editingId, payload);
      else await createReservation(payload);
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Annuler cette réservation ?")) return;
    await cancelReservation(id);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer définitivement cette réservation ?")) return;
    await deleteReservation(id);
    await load();
  }

  return (
    <>
      <PageHeader
        title="Réservations"
        description="Gestion des créneaux — anti-chevauchement et statuts"
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Select
              className="w-auto min-w-[140px]"
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {STATUTS_RESERVATION.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Select
              className="w-auto min-w-[140px]"
              value={filterCourt}
              onChange={(e) => setFilterCourt(e.target.value)}
            >
              <option value="">Tous les courts</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </Select>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle réservation
          </Button>
        </div>

        <SmartReservationPanel
          courts={courts}
          reservations={rawReservations}
          onSelect={(courtId, start, end) => {
            setEditingId(null);
            setForm({
              joueur_id: joueurs[0]?.id ?? "",
              court_id: courtId,
              date_debut: toLocalInput(start.toISOString()),
              date_fin: toLocalInput(end.toISOString()),
              statut: "confirmee",
              notes: "",
            });
            setOpen(true);
          }}
        />

        <ReservationsInfraPanel />

        <Card className="space-y-3 p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted">Aucune réservation.</p>
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-3 border-b border-border/50 pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {r.joueur?.prenom} {r.joueur?.nom} — {r.court?.nom}
                  </p>
                  <p className="text-sm text-muted">
                    {formatDateTime(r.date_debut)} → {formatDateTime(r.date_fin)}
                  </p>
                  {r.notes && <p className="text-xs text-muted">{r.notes}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statutVariant(r.statut)}>{statutLabel(r.statut)}</Badge>
                  {r.statut !== "annulee" && r.statut !== "terminee" && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleCancel(r.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="danger" size="sm" onClick={() => handleDelete(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </Card>
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? "Modifier la réservation" : "Nouvelle réservation"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div>
            <Label>Joueur</Label>
            <Select
              required
              value={form.joueur_id}
              onChange={(e) => setForm({ ...form, joueur_id: e.target.value })}
            >
              {joueurs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.prenom} {j.nom}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Court</Label>
            <Select
              required
              value={form.court_id}
              onChange={(e) => setForm({ ...form, court_id: e.target.value })}
            >
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                  {c.statut === "maintenance" ? " (maintenance)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Début</Label>
              <Input
                type="datetime-local"
                required
                value={form.date_debut}
                onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
              />
            </div>
            <div>
              <Label>Fin</Label>
              <Input
                type="datetime-local"
                required
                value={form.date_fin}
                onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Statut</Label>
            <Select
              value={form.statut}
              onChange={(e) =>
                setForm({ ...form, statut: e.target.value as ReservationInput["statut"] })
              }
            >
              {STATUTS_RESERVATION.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Fermer
            </Button>
            <Button type="submit">{editingId ? "Enregistrer" : "Créer"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

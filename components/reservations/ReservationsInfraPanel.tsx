"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  cancelReservationInfrastructure,
  createReservationInfrastructure,
  getReservationsInfrastructureWithRelations,
} from "@/lib/data/reservation-infra";
import { getInfrastructures } from "@/lib/data/infrastructures";
import type { ReservationInfrastructureInput } from "@/lib/types/reservation-infra";

const empty: ReservationInfrastructureInput = {
  infrastructure_id: "",
  date_debut: "",
  date_fin: "",
  statut: "confirmee",
  joueur_id: null,
  groupe_id: null,
  stage_id: null,
  entraineur_id: null,
  notes: null,
};

export function ReservationsInfraPanel() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof getReservationsInfrastructureWithRelations>>>([]);
  const [infras, setInfras] = useState<{ id: string; nom: string }[]>([]);
  const [form, setForm] = useState<ReservationInfrastructureInput>(empty);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, i] = await Promise.all([
      getReservationsInfrastructureWithRelations(),
      getInfrastructures(),
    ]);
    setItems(r);
    setInfras(i.map((x) => ({ id: x.id, nom: x.nom })));
    if (!form.infrastructure_id && i[0]) {
      const now = new Date();
      const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      setForm((f) => ({
        ...f,
        infrastructure_id: i[0].id,
        date_debut: now.toISOString().slice(0, 16),
        date_fin: end.toISOString().slice(0, 16),
      }));
    }
  }, [form.infrastructure_id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    setError(null);
    try {
      await createReservationInfrastructure({
        ...form,
        date_debut: new Date(form.date_debut).toISOString(),
        date_fin: new Date(form.date_fin).toISOString(),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <Card className="premium space-y-4 p-4">
      <div>
        <h3 className="font-semibold">Réservations infrastructures</h3>
        <p className="text-sm text-muted">
          Fitness, natation, espace physique — anti-conflit automatique
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Label>Infrastructure</Label>
          <Select
            value={form.infrastructure_id}
            onChange={(e) => setForm((f) => ({ ...f, infrastructure_id: e.target.value }))}
          >
            {infras.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nom}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Début</Label>
          <Input
            type="datetime-local"
            value={form.date_debut}
            onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))}
          />
        </div>
        <div>
          <Label>Fin</Label>
          <Input
            type="datetime-local"
            value={form.date_fin}
            onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))}
          />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={submit}>
            Réserver
          </Button>
        </div>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {items.slice(0, 12).map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">{r.infrastructure_nom}</p>
              <p className="text-xs text-muted">
                {new Date(r.date_debut).toLocaleString("fr-FR")} →{" "}
                {new Date(r.date_fin).toLocaleString("fr-FR")}
                {r.stage_libelle ? ` · ${r.stage_libelle}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={r.statut === "confirmee" ? "success" : "muted"}>{r.statut}</Badge>
              {r.statut !== "annulee" && (
                <Button size="sm" variant="danger" onClick={() => cancelReservationInfrastructure(r.id).then(load)}>
                  Annuler
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

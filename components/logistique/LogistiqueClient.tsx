"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import {
  createDemandeLogistique,
  deleteDemandeLogistique,
  getDemandesLogistique,
  refuserDemande,
  updateDemandeLogistique,
  validerDemandeDirection,
  validerDemandeLogistique,
} from "@/lib/data/logistique";
import { STATUTS_DEMANDE, TYPES_DEMANDE } from "@/lib/constants/logistique";
import type { DemandeLogistique, DemandeLogistiqueInput } from "@/lib/types/logistique";
import { formatDate } from "@/lib/utils/dates";
import { Check, Plus, Trash2, X } from "lucide-react";

const empty: DemandeLogistiqueInput = {
  type: "transport",
  demandeur_nom: "",
  demandeur_role: "Coach",
  joueur_concerne_id: null,
  titre: "",
  description: "",
  date_besoin: null,
  statut: "brouillon",
  validateur_direction: null,
  validateur_logistique: null,
  date_validation_direction: null,
  date_validation_logistique: null,
  motif_refus: null,
  notes: null,
};

function statutLabel(s: DemandeLogistique["statut"]) {
  return STATUTS_DEMANDE.find((x) => x.value === s)?.label ?? s;
}

export function LogistiqueClient() {
  const [items, setItems] = useState<DemandeLogistique[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [filterStatut, setFilterStatut] = useState("");

  const load = useCallback(async () => {
    setItems(await getDemandesLogistique());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filterStatut
    ? items.filter((i) => i.statut === filterStatut)
    : items;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createDemandeLogistique(form);
    setOpen(false);
    setForm(empty);
    await load();
  }

  return (
    <>
      <PageHeader
        title="Logistique"
        description="Demandes logistiques — validation direction et service"
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Select
            className="w-auto min-w-[180px]"
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            {STATUTS_DEMANDE.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle demande
          </Button>
        </div>

        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{TYPES_DEMANDE.find((t) => t.value === d.type)?.label}</Badge>
                    <Badge variant="muted">{statutLabel(d.statut)}</Badge>
                  </div>
                  <h3 className="mt-2 font-semibold">{d.titre}</h3>
                  <p className="text-sm text-muted">{d.description}</p>
                  <p className="mt-1 text-xs text-muted">
                    {d.demandeur_nom} · {formatDate(d.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {d.statut === "en_attente" && (
                    <Button
                      size="sm"
                      onClick={() => validerDemandeDirection(d.id, "Direction").then(load)}
                    >
                      <Check className="h-4 w-4" />
                      Valider direction
                    </Button>
                  )}
                  {d.statut === "validee_direction" && (
                    <Button
                      size="sm"
                      onClick={() => validerDemandeLogistique(d.id, "Logistique").then(load)}
                    >
                      Valider logistique
                    </Button>
                  )}
                  {["en_attente", "validee_direction"].includes(d.statut) && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        const m = prompt("Motif du refus :");
                        if (m) refuserDemande(d.id, m).then(load);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteDemandeLogistique(d.id).then(load)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle demande logistique">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as DemandeLogistiqueInput["type"] })
              }
            >
              {TYPES_DEMANDE.filter((t) => t.value !== "billet_avion").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Titre</Label>
            <Input
              required
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Demandeur</Label>
              <Input
                value={form.demandeur_nom}
                onChange={(e) => setForm({ ...form, demandeur_nom: e.target.value })}
              />
            </div>
            <div>
              <Label>Rôle</Label>
              <Input
                value={form.demandeur_role}
                onChange={(e) => setForm({ ...form, demandeur_role: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

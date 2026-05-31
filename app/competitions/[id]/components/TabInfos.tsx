"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { useToast } from "@/components/v2/ui/ToastProvider";
import type { CompetitionListItem } from "@/lib/types/competition";
import { statutCompetitionLabel, visasRequisLabel } from "@/lib/competitions/utils";

export function TabInfos({
  competition,
  onUpdated,
}: {
  competition: CompetitionListItem;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    nom: competition.nom,
    categorie: competition.categorie,
    date_debut: competition.date_debut.slice(0, 10),
    date_fin: competition.date_fin.slice(0, 10),
    lieu: competition.lieu ?? "",
    statut: competition.statut,
    visas_requis: competition.visas_requis ?? false,
    notes: competition.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/competitions/${competition.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        notes: form.notes || null,
        lieu: form.lieu || null,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast(json.error ?? "Erreur", "error");
      return;
    }
    toast("Enregistré", "success");
    if (json.warning) {
      toast(json.warning, "info");
    }
    onUpdated();
  }

  return (
    <Card className="max-w-2xl space-y-4 p-4">
      <p className="text-sm text-muted">
        {competition.nb_participants} participant(s) · Statut affiché :{" "}
        {statutCompetitionLabel(competition.statut_affichage)} ·{" "}
        {visasRequisLabel(competition.visas_requis ?? false)}
      </p>
      <form onSubmit={save} className="space-y-3">
        <div>
          <Label>Nom</Label>
          <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Catégorie</Label>
            <Select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
              <option>Seniors</option>
              <option>Juniors</option>
              <option>U14</option>
              <option>U16</option>
              <option>U18</option>
            </Select>
          </div>
          <div>
            <Label>Statut (base)</Label>
            <Select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value as typeof form.statut })}>
              <option value="a_venir">À venir</option>
              <option value="en_cours">En cours</option>
              <option value="terminee">Terminée</option>
              <option value="annulee">Annulée</option>
            </Select>
          </div>
          <div>
            <Label>Date début</Label>
            <Input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} />
          </div>
          <div>
            <Label>Date fin</Label>
            <Input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Lieu</Label>
          <Input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} />
        </div>
        <div>
          <Label>Visas pour cette compétition</Label>
          <Select
            value={form.visas_requis ? "oui" : "non"}
            onChange={(e) =>
              setForm({ ...form, visas_requis: e.target.value === "oui" })
            }
          >
            <option value="non">Non — pas de suivi visa</option>
            <option value="oui">Oui — suivi visa obligatoire</option>
          </Select>
          <p className="mt-1 text-xs text-muted">
            Les onglets Participants et Passeports &amp; Visas utilisent ce réglage pour tous les
            participants.
          </p>
        </div>
        <div>
          <Label>Notes</Label>
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </Card>
  );
}

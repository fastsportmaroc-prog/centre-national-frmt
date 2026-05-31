"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Search, Trophy } from "lucide-react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { CategorySelect } from "@/components/v2/ui/CategorySelect";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import { EmptyState } from "@/components/v2/ui/EmptyState";
import { useToast } from "@/components/v2/ui/ToastProvider";
import type { CompetitionListItem, CompetitionInput } from "@/lib/types/competition";
import { statutCompetitionBadge, statutCompetitionLabel, visasRequisLabel } from "@/lib/competitions/utils";

const emptyForm = (): CompetitionInput => ({
  nom: "",
  categorie: "Elite Pro",
  date_debut: new Date().toISOString().slice(0, 10),
  date_fin: new Date().toISOString().slice(0, 10),
  lieu: "Rabat",
  statut: "a_venir",
  visas_requis: false,
  notes: null,
});

export function CompetitionsListClient() {
  const { toast } = useToast();
  const [items, setItems] = useState<CompetitionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CompetitionInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [migrationHint, setMigrationHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/competitions");
    const json = await res.json();
    if (!res.ok) {
      setMigrationHint(json.error ?? "Erreur chargement");
      setItems([]);
    } else {
      setMigrationHint(null);
      setItems(json.competitions ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        (c.lieu ?? "").toLowerCase().includes(q) ||
        c.categorie.toLowerCase().includes(q)
    );
  }, [items, search]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast(json.error ?? "Erreur création", "error");
      return;
    }
    toast("Compétition créée", "success");
    if (json.warning) {
      toast(json.warning, "info");
    }
    setOpen(false);
    setForm(emptyForm());
    await load();
    if (json.competition?.id) {
      window.location.href = `/competitions/${json.competition.id}`;
    }
  }

  return (
    <>
      <V2PageHeader
        title="Compétitions"
        description="Gestion des compétitions — participants et logistique"
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Créer une compétition
          </Button>
        }
      />
      <main className="space-y-4 p-4 sm:p-6">
        {migrationHint && (
          <Card className="border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            {migrationHint}
          </Card>
        )}
        <Card className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
            <Input
              className="pl-9"
              placeholder="Rechercher une compétition…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>

        {loading ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="Aucune compétition"
            description="Créez votre première compétition pour commencer."
            actionLabel="Créer une compétition"
            onAction={() => setOpen(true)}
          />
        ) : (
          <div className="grid gap-3">
            {filtered.map((c) => {
              const statut = c.statut_affichage;
              const start = parseISO(c.date_debut);
              const end = parseISO(c.date_fin);
              return (
                <Link key={c.id} href={`/competitions/${c.id}`}>
                  <Card className="cursor-pointer p-4 transition hover:border-frmt-green/40">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-semibold">{c.nom}</p>
                        <p className="mt-1 text-sm text-muted">
                          {format(start, "dd MMM", { locale: fr })} →{" "}
                          {format(end, "dd MMM yyyy", { locale: fr })} · {c.lieu ?? "—"} ·{" "}
                          {c.categorie}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge statut={statutCompetitionBadge(statut)} />
                        <span
                          className={
                            c.visas_requis
                              ? "rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200"
                              : "rounded-full border border-[var(--border)] bg-[var(--bg-main)] px-2 py-0.5 text-xs text-muted"
                          }
                        >
                          {visasRequisLabel(c.visas_requis ?? false)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {statutCompetitionLabel(statut)} · {c.nb_participants} participant
                      {c.nb_participants !== 1 ? "s" : ""}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle compétition">
        <form onSubmit={handleCreate} className="space-y-3 p-4">
          <div>
            <Label>Nom</Label>
            <Input
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Catégorie</Label>
              <CategorySelect
                value={form.categorie}
                onChange={(categorie) => setForm({ ...form, categorie })}
              />
            </div>
            <div>
              <Label>Lieu</Label>
              <Input
                value={form.lieu ?? ""}
                onChange={(e) => setForm({ ...form, lieu: e.target.value })}
              />
            </div>
            <div>
              <Label>Date début</Label>
              <Input
                type="date"
                required
                value={form.date_debut}
                onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
              />
            </div>
            <div>
              <Label>Date fin</Label>
              <Input
                type="date"
                required
                value={form.date_fin}
                onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
              />
            </div>
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
              Ce choix s&apos;applique à tous les participants (joueurs et coaches) dans les onglets
              Passeports &amp; Visas.
            </p>
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Création…" : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

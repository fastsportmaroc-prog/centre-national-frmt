"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { FadeIn } from "@/components/motion/FadeIn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  STATUTS_ENTRAINEUR,
  STATUTS_MISSION,
  TYPES_MISSION,
  coachReferentLabel,
} from "@/lib/constants/entraineurs";
import {
  createEntraineur,
  createMissionEntraineur,
  getDepensesEntraineur,
  getEntraineurs,
  getMissionsEntraineur,
} from "@/lib/data/entraineurs";
import { getGroupes } from "@/lib/data/groupes";
import { getJoueurs } from "@/lib/data/joueurs";
import type { Entraineur, EntraineurInput, MissionEntraineurInput } from "@/lib/types/entraineurs";
import type { Groupe } from "@/lib/types/database";
import { formatDate } from "@/lib/utils/dates";
import { Calendar, ChevronRight, Plus, UserCog } from "lucide-react";

function emptyEntraineur(): EntraineurInput {
  return {
    prenom: "",
    nom: "",
    email: null,
    telephone: null,
    specialite: null,
    licence_fft: null,
    statut: "actif",
    groupe_ids: [],
    budget_voyages_annuel: null,
    photo_url: null,
    notes: null,
  };
}

function statutVariant(statut: string): "default" | "success" | "warning" | "muted" {
  if (statut === "actif") return "success";
  if (statut === "en_mission") return "warning";
  return "muted";
}

export function EntraineursClient() {
  const [entraineurs, setEntraineurs] = useState<Entraineur[]>([]);
  const [missions, setMissions] = useState<Awaited<ReturnType<typeof getMissionsEntraineur>>>([]);
  const [depenses, setDepenses] = useState<Awaited<ReturnType<typeof getDepensesEntraineur>>>([]);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [joueursCount, setJoueursCount] = useState<Record<string, number>>({});
  const [filtreStatut, setFiltreStatut] = useState("");
  const [open, setOpen] = useState(false);
  const [openMission, setOpenMission] = useState(false);
  const [form, setForm] = useState<EntraineurInput>(emptyEntraineur());
  const [missionForm, setMissionForm] = useState<MissionEntraineurInput>({
    entraineur_id: "",
    stage_id: null,
    titre: "",
    lieu: null,
    date_debut: new Date().toISOString().split("T")[0]!,
    date_fin: new Date().toISOString().split("T")[0]!,
    type_mission: "stage",
    statut: "planifie",
    notes: null,
  });

  const load = useCallback(async () => {
    const [e, m, d, g, j] = await Promise.all([
      getEntraineurs(),
      getMissionsEntraineur(),
      getDepensesEntraineur(),
      getGroupes(),
      getJoueurs(),
    ]);
    setEntraineurs(e);
    setMissions(m);
    setDepenses(d);
    setGroupes(g);
    const counts: Record<string, number> = {};
    for (const coach of e) {
      const label = coachReferentLabel(coach.prenom, coach.nom);
      counts[coach.id] = j.filter((x) => x.coach_referent === label).length;
    }
    setJoueursCount(counts);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return entraineurs.filter((e) => !filtreStatut || e.statut === filtreStatut);
  }, [entraineurs, filtreStatut]);

  const prochainesMissions = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]!;
    return missions
      .filter((m) => m.date_fin >= today && m.statut !== "annule")
      .slice(0, 6);
  }, [missions]);

  const depensesParEntraineur = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of depenses) {
      map.set(d.entraineur_id, (map.get(d.entraineur_id) ?? 0) + d.montant);
    }
    return map;
  }, [depenses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createEntraineur({
      ...form,
      email: form.email || null,
      telephone: form.telephone || null,
      specialite: form.specialite || null,
      licence_fft: form.licence_fft || null,
      notes: form.notes || null,
      budget_voyages_annuel: form.budget_voyages_annuel
        ? Number(form.budget_voyages_annuel)
        : null,
    });
    setOpen(false);
    setForm(emptyEntraineur());
    await load();
  }

  async function handleMissionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!missionForm.entraineur_id) return;
    await createMissionEntraineur({
      ...missionForm,
      stage_id: missionForm.stage_id || null,
      lieu: missionForm.lieu || null,
      notes: missionForm.notes || null,
    });
    setOpenMission(false);
    await load();
  }

  return (
    <FadeIn>
      <PageHeader
        title="Entraîneurs"
        description="Fiches staff, missions, voyages et disponibilités"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setOpenMission(true)}>
              <Calendar className="h-4 w-4" />
              Mission
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Entraîneur
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="premium p-4">
          <p className="text-xs text-muted">Entraîneurs actifs</p>
          <p className="text-2xl font-semibold text-foreground">
            {entraineurs.filter((e) => e.statut !== "inactif").length}
          </p>
        </Card>
        <Card className="premium p-4">
          <p className="text-xs text-muted">Missions à venir</p>
          <p className="text-2xl font-semibold text-foreground">{prochainesMissions.length}</p>
        </Card>
        <Card className="premium p-4">
          <p className="text-xs text-muted">Dépenses voyages (total)</p>
          <p className="text-2xl font-semibold text-foreground">
            {depenses.reduce((s, d) => s + d.montant, 0).toLocaleString("fr-FR")} MAD
          </p>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          value={filtreStatut}
          onChange={(ev) => setFiltreStatut(ev.target.value)}
          className="w-48"
        >
          <option value="">Tous les statuts</option>
          {STATUTS_ENTRAINEUR.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {filtered.map((e) => {
            const nbJoueurs = joueursCount[e.id] ?? 0;
            const depTotal = depensesParEntraineur.get(e.id) ?? 0;
            const nbMissions = missions.filter((m) => m.entraineur_id === e.id).length;
            return (
              <Link key={e.id} href={`/entraineurs/${e.id}`}>
                <Card className="premium flex items-center justify-between gap-4 p-4 transition hover:border-tennis/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-tennis/15 text-tennis">
                      <UserCog className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {e.prenom} {e.nom}
                      </p>
                      <p className="text-sm text-muted">{e.specialite ?? "—"}</p>
                      <p className="mt-1 text-xs text-muted">
                        {nbJoueurs} joueur(s) · {nbMissions} mission(s) ·{" "}
                        {depTotal.toLocaleString("fr-FR")} MAD dépenses
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statutVariant(e.statut)}>
                      {STATUTS_ENTRAINEUR.find((s) => s.value === e.statut)?.label}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card className="premium p-4">
          <h3 className="mb-3 font-medium text-foreground">Calendrier missions</h3>
          <ul className="space-y-3">
            {prochainesMissions.length === 0 ? (
              <li className="text-sm text-muted">Aucune mission planifiée</li>
            ) : (
              prochainesMissions.map((m) => {
                const coach = entraineurs.find((e) => e.id === m.entraineur_id);
                return (
                  <li key={m.id} className="border-b border-border pb-2 text-sm last:border-0">
                    <p className="font-medium text-foreground">{m.titre}</p>
                    <p className="text-muted">
                      {coach ? `${coach.prenom} ${coach.nom}` : "—"} ·{" "}
                      {formatDate(m.date_debut)} → {formatDate(m.date_fin)}
                    </p>
                    <span className="mt-1 inline-block">
                      <Badge variant="muted">
                        {STATUTS_MISSION.find((s) => s.value === m.statut)?.label}
                      </Badge>
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </Card>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nouvel entraîneur">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Prénom</Label>
              <Input
                required
                value={form.prenom}
                onChange={(ev) => setForm({ ...form, prenom: ev.target.value })}
              />
            </div>
            <div>
              <Label>Nom</Label>
              <Input
                required
                value={form.nom}
                onChange={(ev) => setForm({ ...form, nom: ev.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Spécialité</Label>
            <Input
              value={form.specialite ?? ""}
              onChange={(ev) => setForm({ ...form, specialite: ev.target.value })}
            />
          </div>
          <div>
            <Label>Statut</Label>
            <Select
              value={form.statut}
              onChange={(ev) =>
                setForm({ ...form, statut: ev.target.value as EntraineurInput["statut"] })
              }
            >
              {STATUTS_ENTRAINEUR.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Budget voyages annuel (MAD)</Label>
            <Input
              type="number"
              value={form.budget_voyages_annuel ?? ""}
              onChange={(ev) =>
                setForm({
                  ...form,
                  budget_voyages_annuel: ev.target.value ? Number(ev.target.value) : null,
                })
              }
            />
          </div>
          <div>
            <Label>Groupes</Label>
            <Select
              multiple
              className="min-h-[100px]"
              value={form.groupe_ids}
              onChange={(ev) => {
                const selected = [...ev.target.selectedOptions].map((o) => o.value);
                setForm({ ...form, groupe_ids: selected });
              }}
            >
              {groupes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nom}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      <Modal open={openMission} onClose={() => setOpenMission(false)} title="Nouvelle mission">
        <form onSubmit={handleMissionSubmit} className="space-y-4">
          <div>
            <Label>Entraîneur</Label>
            <Select
              required
              value={missionForm.entraineur_id}
              onChange={(ev) => setMissionForm({ ...missionForm, entraineur_id: ev.target.value })}
            >
              <option value="">—</option>
              {entraineurs.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.prenom} {e.nom}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Titre</Label>
            <Input
              required
              value={missionForm.titre}
              onChange={(ev) => setMissionForm({ ...missionForm, titre: ev.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Début</Label>
              <Input
                type="date"
                required
                value={missionForm.date_debut}
                onChange={(ev) => setMissionForm({ ...missionForm, date_debut: ev.target.value })}
              />
            </div>
            <div>
              <Label>Fin</Label>
              <Input
                type="date"
                required
                value={missionForm.date_fin}
                onChange={(ev) => setMissionForm({ ...missionForm, date_fin: ev.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Type</Label>
              <Select
                value={missionForm.type_mission}
                onChange={(ev) =>
                  setMissionForm({
                    ...missionForm,
                    type_mission: ev.target.value as MissionEntraineurInput["type_mission"],
                  })
                }
              >
                {TYPES_MISSION.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select
                value={missionForm.statut}
                onChange={(ev) =>
                  setMissionForm({
                    ...missionForm,
                    statut: ev.target.value as MissionEntraineurInput["statut"],
                  })
                }
              >
                {STATUTS_MISSION.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpenMission(false)}>
              Annuler
            </Button>
            <Button type="submit">Créer</Button>
          </div>
        </form>
      </Modal>
    </FadeIn>
  );
}

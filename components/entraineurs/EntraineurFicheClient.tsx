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
  coachReferentLabel,
} from "@/lib/constants/entraineurs";
import {
  createEntraineurDepense,
  getDepensesByEntraineur,
  getDisponibilitesEntraineur,
  getEntraineurById,
  getMissionsByEntraineur,
  getTotalDepensesEntraineur,
  setDisponibiliteEntraineur,
} from "@/lib/data/entraineurs";
import { getGroupes } from "@/lib/data/groupes";
import { getJoueurs } from "@/lib/data/joueurs";
import { getStagesProgramme } from "@/lib/data/stages";
import type { EntraineurDepenseInput } from "@/lib/types/entraineurs";
import { formatDate } from "@/lib/utils/dates";
import { ArrowLeft, Plus } from "lucide-react";
import { StageParticipantLinks } from "@/components/stages/StageParticipantLinks";

const CATEGORIES_DEPENSE = [
  { value: "billet_avion", label: "Billet avion" },
  { value: "hebergement", label: "Hébergement" },
  { value: "transport", label: "Transport" },
  { value: "restauration", label: "Restauration" },
  { value: "autre", label: "Autre" },
] as const;

type Tab = "missions" | "depenses" | "joueurs" | "dispo";

export function EntraineurFicheClient({ id }: { id: string }) {
  const [tab, setTab] = useState<Tab>("missions");
  const [openDepense, setOpenDepense] = useState(false);
  const [reload, setReload] = useState(0);
  const [entraineur, setEntraineur] = useState<Awaited<ReturnType<typeof getEntraineurById>>>(null);
  const [missions, setMissions] = useState<Awaited<ReturnType<typeof getMissionsByEntraineur>>>([]);
  const [depenses, setDepenses] = useState<Awaited<ReturnType<typeof getDepensesByEntraineur>>>([]);
  const [dispos, setDispos] = useState<Awaited<ReturnType<typeof getDisponibilitesEntraineur>>>([]);
  const [totalDep, setTotalDep] = useState(0);
  const [joueurs, setJoueurs] = useState<Awaited<ReturnType<typeof getJoueurs>>>([]);
  const [groupes, setGroupes] = useState<Awaited<ReturnType<typeof getGroupes>>>([]);
  const [stages, setStages] = useState<Awaited<ReturnType<typeof getStagesProgramme>>>([]);
  const [depenseForm, setDepenseForm] = useState<EntraineurDepenseInput>({
    entraineur_id: id,
    date_depense: new Date().toISOString().split("T")[0]!,
    categorie: "transport",
    libelle: "",
    montant: 0,
    devise: "MAD",
    mission_id: null,
  });

  const load = useCallback(async () => {
    const e = await getEntraineurById(id);
    if (!e) return;
    const [m, d, disp, tot, j, g, st] = await Promise.all([
      getMissionsByEntraineur(id),
      getDepensesByEntraineur(id),
      getDisponibilitesEntraineur(),
      getTotalDepensesEntraineur(id),
      getJoueurs(),
      getGroupes(),
      getStagesProgramme(),
    ]);
    setEntraineur(e);
    setMissions(m);
    setDepenses(d);
    setDispos(disp.filter((x) => x.entraineur_id === id));
    setTotalDep(tot);
    setJoueurs(j);
    setGroupes(g);
    setStages(st);
  }, [id]);

  useEffect(() => {
    load();
  }, [load, reload]);

  const coachLabel = entraineur
    ? coachReferentLabel(entraineur.prenom, entraineur.nom)
    : "";
  const joueursLies = useMemo(
    () => joueurs.filter((j) => j.coach_referent === coachLabel),
    [joueurs, coachLabel]
  );
  const groupesLabels = useMemo(() => {
    if (!entraineur) return [];
    return entraineur.groupe_ids
      .map((gid) => groupes.find((g) => g.id === gid)?.nom)
      .filter(Boolean);
  }, [entraineur, groupes]);

  const budgetPct = useMemo(() => {
    if (!entraineur?.budget_voyages_annuel) return 0;
    return Math.min(
      100,
      Math.round((totalDep / entraineur.budget_voyages_annuel) * 100)
    );
  }, [entraineur, totalDep]);

  async function toggleDispo(date: string, disponible: boolean) {
    await setDisponibiliteEntraineur({
      entraineur_id: id,
      date,
      disponible,
      motif: disponible ? null : "Indisponible",
    });
    setReload((n) => n + 1);
  }

  async function handleDepense(e: React.FormEvent) {
    e.preventDefault();
    await createEntraineurDepense({
      ...depenseForm,
      entraineur_id: id,
      mission_id: depenseForm.mission_id || null,
    });
    setOpenDepense(false);
    setReload((n) => n + 1);
  }

  if (!entraineur) {
    return (
      <p className="text-muted p-8">Entraîneur introuvable.</p>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "missions", label: "Missions" },
    { id: "depenses", label: "Dépenses" },
    { id: "joueurs", label: "Joueurs" },
    { id: "dispo", label: "Disponibilité" },
  ];

  return (
    <FadeIn>
      <Link
        href="/entraineurs"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <PageHeader
        title={`${entraineur.prenom} ${entraineur.nom}`}
        description={entraineur.specialite ?? "Fiche entraîneur"}
        actions={
          <Badge variant={entraineur.statut === "actif" ? "success" : "warning"}>
            {STATUTS_ENTRAINEUR.find((s) => s.value === entraineur.statut)?.label}
          </Badge>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="premium p-4 md:col-span-2">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Email</dt>
              <dd>{entraineur.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Téléphone</dt>
              <dd>{entraineur.telephone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Licence FFT</dt>
              <dd>{entraineur.licence_fft ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Groupes</dt>
              <dd>{groupesLabels.join(", ") || "—"}</dd>
            </div>
          </dl>
        </Card>
        <Card className="premium p-4">
          <p className="text-xs text-muted">Budget voyages</p>
          <p className="text-lg font-semibold">
            {totalDep.toLocaleString("fr-FR")} /{" "}
            {(entraineur.budget_voyages_annuel ?? 0).toLocaleString("fr-FR")} MAD
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-tennis transition-all"
              style={{ width: `${budgetPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">{budgetPct}% consommé</p>
        </Card>
      </div>

      <StageParticipantLinks
        kind="coach"
        entityId={id}
        label={`${entraineur.prenom} ${entraineur.nom}`}
      />

      <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === t.id ? "bg-tennis/20 text-tennis" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
        {tab === "depenses" && (
          <Button size="sm" className="ml-auto" onClick={() => setOpenDepense(true)}>
            <Plus className="h-3 w-3" />
            Dépense
          </Button>
        )}
      </div>

      {tab === "missions" && (
        <Card className="premium overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3">Mission</th>
                <th className="p-3">Dates</th>
                <th className="p-3">Type</th>
                <th className="p-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {missions.map((m) => {
                const stage = stages.find((s) => s.id === m.stage_id);
                return (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="p-3">
                      <p className="font-medium">{m.titre}</p>
                      {stage && (
                        <p className="text-xs text-muted">Stage : {stage.stage_action}</p>
                      )}
                    </td>
                    <td className="p-3 text-muted">
                      {formatDate(m.date_debut)} → {formatDate(m.date_fin)}
                    </td>
                    <td className="p-3 capitalize">{m.type_mission}</td>
                    <td className="p-3">
                      <Badge variant="muted">
                        {STATUTS_MISSION.find((s) => s.value === m.statut)?.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "depenses" && (
        <Card className="premium overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3">Date</th>
                <th className="p-3">Libellé</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {depenses.map((d) => (
                <tr key={d.id} className="border-b border-border/50">
                  <td className="p-3">{formatDate(d.date_depense)}</td>
                  <td className="p-3">{d.libelle}</td>
                  <td className="p-3 capitalize">{d.categorie.replace("_", " ")}</td>
                  <td className="p-3 text-right font-medium">
                    {d.montant.toLocaleString("fr-FR")} {d.devise}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "joueurs" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {joueursLies.length === 0 ? (
            <p className="text-muted">Aucun joueur avec coach référent « {coachLabel} »</p>
          ) : (
            joueursLies.map((j) => (
              <Link key={j.id} href={`/joueurs/${j.id}`}>
                <Card className="premium p-4 hover:border-tennis/40">
                  <p className="font-medium">
                    {j.prenom} {j.nom}
                  </p>
                  <p className="text-sm text-muted">{j.categorie_age}</p>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === "dispo" && (
        <Card className="premium p-4">
          <p className="mb-3 text-sm text-muted">7 prochains jours</p>
          <ul className="space-y-2">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const date = d.toISOString().split("T")[0]!;
              const row = dispos.find((x) => x.date === date);
              const disponible = row?.disponible ?? true;
              return (
                <li
                  key={date}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span>{formatDate(date)}</span>
                  <Button
                    size="sm"
                    variant={disponible ? "secondary" : "danger"}
                    onClick={() => toggleDispo(date, !disponible)}
                  >
                    {disponible ? "Disponible" : "Indisponible"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Modal open={openDepense} onClose={() => setOpenDepense(false)} title="Nouvelle dépense">
        <form onSubmit={handleDepense} className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              required
              value={depenseForm.date_depense}
              onChange={(ev) => setDepenseForm({ ...depenseForm, date_depense: ev.target.value })}
            />
          </div>
          <div>
            <Label>Libellé</Label>
            <Input
              required
              value={depenseForm.libelle}
              onChange={(ev) => setDepenseForm({ ...depenseForm, libelle: ev.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Catégorie</Label>
              <Select
                value={depenseForm.categorie}
                onChange={(ev) =>
                  setDepenseForm({
                    ...depenseForm,
                    categorie: ev.target.value as EntraineurDepenseInput["categorie"],
                  })
                }
              >
                {CATEGORIES_DEPENSE.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Montant (MAD)</Label>
              <Input
                type="number"
                required
                min={0}
                value={depenseForm.montant || ""}
                onChange={(ev) =>
                  setDepenseForm({ ...depenseForm, montant: Number(ev.target.value) })
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpenDepense(false)}>
              Annuler
            </Button>
            <Button type="submit">Ajouter</Button>
          </div>
        </form>
      </Modal>
    </FadeIn>
  );
}

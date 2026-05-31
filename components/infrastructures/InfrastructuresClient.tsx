"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  createInfrastructure,
  deleteInfrastructure,
  getInfrastructures,
  setInfrastructureStatus,
} from "@/lib/data/infrastructures";
import { getCourtsWithStats } from "@/lib/data/courts";
import type { Infrastructure, InfrastructureInput, StatutInfrastructure, TypeInfrastructure } from "@/lib/types/infrastructures";
import { isTerrainInfrastructure } from "@/lib/utils/infrastructure-court";
import { getStageProvisionSummaries } from "@/lib/data/stage-besoins";
import type { StageProvisionSummary } from "@/lib/data/stage-besoins";
import { StageProvisionList } from "@/components/stages/StageProvisionList";
import {
  getOccupationCentre,
  occupationBarColor,
  type OccupationCentreResult,
  type PeriodeOccupation,
} from "@/lib/data/centre-occupation";
import { getAllStagesForSelect } from "@/lib/data/dashboard-stages";
import type { StageProgramme } from "@/lib/types/stages";
import { formatDate } from "@/lib/utils/dates";
import { Plus } from "lucide-react";

const emptyForm: InfrastructureInput = {
  nom: "",
  type: "terrain",
  surface: "terre_battue",
  capacite: 4,
  actif: true,
  statut: "disponible",
  notes: null,
};

type Filtre = "tous" | "terrains" | "espaces";

const TYPE_LABELS: Record<TypeInfrastructure, string> = {
  terrain: "Terrain / court",
  emplacement_physique: "Espace physique",
  fitness: "Fitness",
  natation: "Natation",
  autre: "Autre",
};

export function InfrastructuresClient() {
  const [items, setItems] = useState<Infrastructure[]>([]);
  const [terrainStats, setTerrainStats] = useState<Map<string, { count: number; rate: number }>>(
    new Map()
  );
  const [form, setForm] = useState<InfrastructureInput>(emptyForm);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [loading, setLoading] = useState(false);
  const [stageProvisions, setStageProvisions] = useState<StageProvisionSummary[]>([]);
  const [occupationPeriode, setOccupationPeriode] = useState<PeriodeOccupation>("semaine");
  const [occupationStageId, setOccupationStageId] = useState<string>("");
  const [stagesSelect, setStagesSelect] = useState<StageProgramme[]>([]);
  const [occupation, setOccupation] = useState<OccupationCentreResult | null>(null);

  const loadOccupation = useCallback(async () => {
    const periode = occupationPeriode;
    const stageId = occupationPeriode === "stage" ? occupationStageId : undefined;
    const occ = await getOccupationCentre(periode, stageId || undefined);
    setOccupation(occ);
  }, [occupationPeriode, occupationStageId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [infras, courts, provisions, stages] = await Promise.all([
        getInfrastructures(),
        getCourtsWithStats(),
        getStageProvisionSummaries(),
        getAllStagesForSelect(),
      ]);
      setItems(infras);
      setStageProvisions(provisions);
      setStagesSelect(stages);
      setTerrainStats(
        new Map(courts.map((c) => [c.id, { count: c.reservations_count, rate: c.taux_occupation }]))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadOccupation();
  }, [loadOccupation]);

  const filtered = useMemo(() => {
    if (filtre === "terrains") return items.filter(isTerrainInfrastructure);
    if (filtre === "espaces") return items.filter((i) => !isTerrainInfrastructure(i));
    return items;
  }, [items, filtre]);

  async function submit() {
    if (!form.nom.trim()) return;
    await createInfrastructure({ ...form, nom: form.nom.trim() });
    setForm(emptyForm);
    await load();
  }

  async function setStatut(id: string, statut: StatutInfrastructure) {
    await setInfrastructureStatus(id, statut);
    await load();
  }

  return (
    <>
      <PageHeader
        title="Infrastructures & terrains"
        description="Une seule liste : courts de tennis, fitness, natation et espaces — utilisée par les réservations et le planning"
      />
      <main className="space-y-4 p-4 sm:p-6">
        <Card className="premium border-frmt-green/20 bg-frmt-green/5 p-4 text-sm">
          <p>
            Les <strong>terrains / courts</strong>{" "}
            sont des infrastructures de type « terrain ». Les réservations et le planning
            s&apos;appuient sur cette liste — plus de doublon avec une rubrique séparée.
          </p>
          <Link href="/reservations" className="mt-2 inline-block text-frmt-green hover:underline">
            Gérer les réservations →
          </Link>
        </Card>

        <StageProvisionList
          summaries={stageProvisions}
          filter="terrains"
          emptyMessage="Aucune réservation terrain auto-créée par un stage."
        />

        <Card className="premium p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Occupation du centre</h2>
            <div className="flex flex-wrap items-center gap-2">
              {(["semaine", "mois", "stage"] as const).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={occupationPeriode === p ? "primary" : "secondary"}
                  onClick={() => setOccupationPeriode(p)}
                >
                  {p === "semaine" ? "Semaine" : p === "mois" ? "Mois" : "Par stage"}
                </Button>
              ))}
              {occupationPeriode === "stage" && (
                <Select
                  value={occupationStageId}
                  onChange={(e) => setOccupationStageId(e.target.value)}
                  className="min-w-[200px]"
                >
                  <option value="">Choisir un stage…</option>
                  {stagesSelect.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.stage_action} ({formatDate(s.date_debut)})
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </div>
          {occupation && (
            <p className="text-xs text-muted">
              Période : {formatDate(occupation.date_debut)} → {formatDate(occupation.date_fin)}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="p-3">Installation</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Capacité</th>
                  <th className="p-3">Réservé</th>
                  <th className="p-3">Libre</th>
                  <th className="p-3">%</th>
                  <th className="p-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {!occupation || occupation.lignes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-muted">
                      Aucune donnée d&apos;occupation pour cette période.
                    </td>
                  </tr>
                ) : (
                  occupation.lignes.map((l) => (
                    <tr key={l.infrastructure_id} className="border-b border-border/50">
                      <td className="p-3 font-medium">{l.nom}</td>
                      <td className="p-3">{TYPE_LABELS[l.type] ?? l.type}</td>
                      <td className="p-3">{l.capacite}</td>
                      <td className="p-3">{l.reserve}</td>
                      <td className="p-3">{l.libre}</td>
                      <td className="p-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${occupationBarColor(l.pct)}`}
                              style={{ width: `${l.pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted w-8">{l.pct}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            l.statut === "disponible"
                              ? "success"
                              : l.statut === "maintenance"
                                ? "warning"
                                : "muted"
                          }
                        >
                          {l.statut}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["tous", "Tous"],
              ["terrains", "Terrains / courts"],
              ["espaces", "Fitness, natation, espaces"],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              size="sm"
              variant={filtre === id ? "primary" : "secondary"}
              onClick={() => setFiltre(id)}
            >
              {label}
            </Button>
          ))}
        </div>

        <Card className="premium grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-2">
            <Label>Nom</Label>
            <Input value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} />
          </div>
          <div>
            <Label>Type</Label>
            <Select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as InfrastructureInput["type"] }))
              }
            >
              <option value="terrain">Terrain / court</option>
              <option value="emplacement_physique">Espace physique</option>
              <option value="fitness">Fitness</option>
              <option value="natation">Natation</option>
              <option value="autre">Autre</option>
            </Select>
          </div>
          <div>
            <Label>Surface</Label>
            <Select
              value={form.surface}
              onChange={(e) =>
                setForm((f) => ({ ...f, surface: e.target.value as InfrastructureInput["surface"] }))
              }
            >
              <option value="terre_battue">Terre battue</option>
              <option value="dur">Dur</option>
              <option value="indoor">Indoor</option>
              <option value="exterieur">Extérieur</option>
              <option value="autre">Autre</option>
            </Select>
          </div>
          <div>
            <Label>Capacité</Label>
            <Input
              type="number"
              value={form.capacite}
              onChange={(e) => setForm((f) => ({ ...f, capacite: Number(e.target.value) || 0 }))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={submit} className="w-full">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </Card>

        <Card className="premium overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3">Nom</th>
                <th className="p-3">Type</th>
                <th className="p-3">Surface</th>
                <th className="p-3">Capacité</th>
                <th className="p-3">Occupation (jour)</th>
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-4 text-muted" colSpan={7}>
                    Chargement…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="p-4 text-muted" colSpan={7}>
                    Aucune infrastructure pour ce filtre.
                  </td>
                </tr>
              ) : (
                filtered.map((i) => {
                  const stats = terrainStats.get(i.id);
                  return (
                    <tr key={i.id} className="border-b border-border/50">
                      <td className="p-3 font-medium">
                        {i.nom}
                        {isTerrainInfrastructure(i) && (
                          <Badge variant="muted" className="ml-2 text-xs">
                            Court
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">{TYPE_LABELS[i.type]}</td>
                      <td className="p-3">{i.surface.replaceAll("_", " ")}</td>
                      <td className="p-3">{i.capacite}</td>
                      <td className="p-3 text-muted">
                        {stats ? `${stats.rate}% (${stats.count} résa.)` : "—"}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            i.statut === "disponible"
                              ? "success"
                              : i.statut === "maintenance"
                                ? "warning"
                                : "muted"
                          }
                        >
                          {i.statut}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setStatut(i.id, "disponible")}
                          >
                            Disponible
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setStatut(i.id, "maintenance")}
                          >
                            Maintenance
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => deleteInfrastructure(i.id).then(load)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Input";
import {
  getOccupationAlertes,
  getOccupationAutomatique,
  getOccupationByDate,
  getOccupationCentreResume,
  getOccupationCne,
} from "@/lib/data/occupation-cne";
import { buildOccupationAutoReport } from "@/lib/reports/occupation-auto";
import { exportPdfReport, openPrintReport } from "@/lib/export/reports";
import type { OccupationCneSnapshot, OccupationCentreResume } from "@/lib/types/occupation-cne";
import { formatDate } from "@/lib/utils/dates";
import { AlertTriangle, BedDouble, FileDown, MapPin, Printer } from "lucide-react";
import Link from "next/link";

export function OccupationCneClient() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]!);
  const [resume, setResume] = useState<OccupationCentreResume | null>(null);
  const [snapshots, setSnapshots] = useState<OccupationCneSnapshot[]>([]);
  const [alertes, setAlertes] = useState<OccupationCneSnapshot[]>([]);
  const [historique, setHistorique] = useState<OccupationCneSnapshot[]>([]);
  const [auto, setAuto] = useState<Awaited<ReturnType<typeof getOccupationAutomatique>> | null>(
    null
  );

  const load = useCallback(async () => {
    const [r, s, a, all, autoDay] = await Promise.all([
      getOccupationCentreResume(date),
      getOccupationByDate(date),
      getOccupationAlertes(),
      getOccupationCne(),
      getOccupationAutomatique(date),
    ]);
    setResume(r);
    setSnapshots(s);
    setAlertes(a.filter((x) => x.date === date || !date));
    setHistorique(all);
    setAuto(autoDay);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const chambres = useMemo(
    () =>
      snapshots.filter(
        (x) => x.pavillon > 0 && x.type_chambre !== "centre" && x.type_chambre !== "terrains"
      ),
    [snapshots]
  );

  const byPavillon = useMemo(() => {
    const m = new Map<number, OccupationCneSnapshot[]>();
    for (const c of chambres) {
      if (!m.has(c.pavillon)) m.set(c.pavillon, []);
      m.get(c.pavillon)!.push(c);
    }
    return [...m.entries()].sort(([a], [b]) => a - b);
  }, [chambres]);

  const datesHistorique = useMemo(() => {
    const set = new Set(historique.map((h) => h.date));
    return [...set].sort().reverse().slice(0, 14);
  }, [historique]);

  function buildAutoReportMeta() {
    if (!auto) return null;
    return buildOccupationAutoReport({
      date: auto.date,
      taux_chambres_pct: auto.taux_chambres_pct,
      chambres_occupees: auto.chambres_occupees,
      chambres_total: auto.chambres_total,
      terrains_occupes: auto.terrains_occupes,
      terrains_total: auto.terrains_total,
      taux_terrains_pct: auto.taux_terrains_pct ?? 0,
      taux_fitness_pct: auto.taux_fitness_pct ?? 0,
      taux_natation_pct: auto.taux_natation_pct ?? 0,
      alertes: auto.alertes ?? [],
    });
  }

  return (
    <>
      <PageHeader
        title="Occupation CNE"
        description="Gestion Occupation CNE.xlsx — chambres, centre, terrains, alertes"
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Link href="/import-cne">
            <Button variant="secondary" size="sm">
              Import Excel CNE
            </Button>
          </Link>
          <Link href="/hebergement">
            <Button variant="ghost" size="sm">
              Hébergement détaillé
            </Button>
          </Link>
        </div>

        {auto && (
          <Card className="premium space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Occupation automatique</h2>
                <p className="text-sm text-muted">
                  Calcul live : stages, réservations infrastructures, hébergement
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const meta = buildAutoReportMeta();
                    if (meta) openPrintReport(meta);
                  }}
                >
                  <Printer className="h-4 w-4" />
                  Imprimer
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const meta = buildAutoReportMeta();
                    if (meta) exportPdfReport(`occupation-auto-${date}.pdf`, meta);
                  }}
                >
                  <FileDown className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-3">
                <p className="text-xs text-muted">Terrains</p>
                <p className="text-xl font-semibold">{auto.taux_terrains_pct ?? 0}%</p>
                <p className="text-xs text-muted">
                  {auto.terrains_occupes}/{auto.terrains_total}
                </p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted">Fitness</p>
                <p className="text-xl font-semibold">{auto.taux_fitness_pct ?? 0}%</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted">Natation</p>
                <p className="text-xl font-semibold">{auto.taux_natation_pct ?? 0}%</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted">Chambres (auto)</p>
                <p className="text-xl font-semibold">{auto.taux_chambres_pct}%</p>
              </Card>
            </div>
            {(auto.alertes?.length ?? 0) > 0 && (
              <ul className="space-y-1 text-sm text-amber-300">
                {auto.alertes!.map((msg) => (
                  <li key={msg}>• {msg}</li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {resume && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-sm text-muted flex items-center gap-1">
                <BedDouble className="h-4 w-4" />
                Chambres (Excel)
              </p>
              <p className="text-2xl font-semibold">{resume.taux_chambres_pct}%</p>
              <p className="text-xs text-muted">
                {resume.chambres_occupees}/{resume.chambres_total} occupées
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Terrains
              </p>
              <p className="text-2xl font-semibold">
                {resume.terrains_occupes}/{resume.terrains_total}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Alertes surcharge
              </p>
              <p className="text-2xl font-semibold text-frmt-red">{resume.alertes_surcharge}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-muted">Date</p>
              <p className="text-lg font-semibold">{formatDate(resume.date)}</p>
            </Card>
          </div>
        )}

        {alertes.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/10 p-4">
            <h3 className="font-semibold text-amber-400 mb-2">Alertes</h3>
            <ul className="space-y-1 text-sm">
              {alertes.slice(0, 8).map((a) => (
                <li key={a.id}>
                  Pav. {a.pavillon} ch. {a.numero_chambre} — {a.alerte ?? "Surcharge"}{" "}
                  ({a.taux_occupation_pct}%)
                </li>
              ))}
            </ul>
          </Card>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Occupation par pavillon</h2>
          {byPavillon.map(([pav, rows]) => (
            <Card key={pav} className="p-4">
              <h3 className="mb-3 font-medium">Pavillon {pav}</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-lg border p-3 text-sm ${
                      c.taux_occupation_pct > 100
                        ? "border-frmt-red/50 bg-frmt-red/10"
                        : c.occupants > 0
                          ? "border-frmt-green/30"
                          : "border-border"
                    }`}
                  >
                    <p className="font-medium">
                      Ch. {c.numero_chambre} · {c.type_chambre}
                    </p>
                    <p className="text-muted">
                      {c.occupants}/{c.capacite} — {c.taux_occupation_pct}%
                    </p>
                    {c.stage_libelle && (
                      <p className="text-xs text-frmt-green mt-1 truncate">{c.stage_libelle}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </section>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Historique occupation (dates)</h3>
          <div className="flex flex-wrap gap-2">
            {datesHistorique.map((d) => (
              <Button
                key={d}
                size="sm"
                variant={d === date ? "primary" : "ghost"}
                onClick={() => setDate(d)}
              >
                {formatDate(d)}
              </Button>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}

"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import type { AnalyticsDashboard } from "@/lib/types/analytics";
import {
  BarChart3,
  BedDouble,
  Plane,
  Truck,
  Users,
  CalendarCheck,
  UtensilsCrossed,
  Trophy,
  Wallet,
  Wrench,
} from "lucide-react";

type Props = { data: AnalyticsDashboard };

export function AnalyticsClient({ data }: Props) {
  const maxResa = Math.max(
    1,
    ...data.evolutionReservationsSemaine.map((d) => d.count)
  );

  return (
    <>
      <PageHeader
        title="Analyses"
        description="Tableau de bord analytique du centre"
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Joueurs actifs" value={data.joueursActifs} icon={Users} />
          <StatCard
            label="Réservations aujourd'hui"
            value={data.reservationsAujourdhui}
            icon={CalendarCheck}
          />
          <StatCard
            label="Occupation courts"
            value={`${data.tauxOccupationCourts}%`}
            icon={BarChart3}
          />
          <StatCard
            label="Logistique en attente"
            value={data.demandesLogistiqueEnAttente}
            icon={Truck}
          />
          <StatCard label="Billets validés" value={data.billetsValides} icon={Plane} />
          <StatCard
            label="Chambres"
            value={`${data.chambresOccupees}/${data.chambresTotal}`}
            icon={BedDouble}
          />
          <StatCard label="Repas du jour" value={data.repasAujourdhui} icon={UtensilsCrossed} />
          <StatCard
            label="Réservations annulées"
            value={data.reservationsAnnulees}
            icon={BarChart3}
          />
          <StatCard label="Stages actifs" value={data.stagesActifs} icon={Trophy} />
          <StatCard
            label="Budget déplacements validés"
            value={data.budgetsDeplacementValides}
            icon={Wallet}
          />
          <StatCard
            label="Budget mensuel (réel)"
            value={`${data.budgetMensuelMAD.toLocaleString("fr-FR")} MAD`}
            icon={Wallet}
          />
          <StatCard
            label="Stock matériel faible"
            value={data.materielStockFaible}
            icon={Wrench}
            hint={data.materielStockFaible > 0 ? "Sous seuil d'alerte" : "OK"}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="font-semibold mb-4">Réservations — 7 derniers jours</h3>
            <div className="flex items-end gap-2 h-40">
              {data.evolutionReservationsSemaine.map((d) => (
                <div key={d.jour} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-tennis/80 min-h-[4px]"
                    style={{ height: `${(d.count / maxResa) * 100}%` }}
                    title={`${d.count} réservation(s)`}
                  />
                  <span className="text-[10px] text-muted uppercase">{d.jour}</span>
                  <span className="text-xs font-medium">{d.count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">Joueurs par groupe</h3>
            <ul className="space-y-2">
              {data.statsParGroupe.map((g) => (
                <li key={g.nom} className="flex justify-between text-sm">
                  <span>{g.nom}</span>
                  <span className="font-medium text-tennis">{g.count}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">Budget déplacement par joueur</h3>
            {data.budgetsParJoueur.length === 0 ? (
              <p className="text-sm text-muted">Aucun budget enregistré.</p>
            ) : (
              <ul className="space-y-2">
                {data.budgetsParJoueur.map((j) => (
                  <li key={j.nom} className="flex justify-between text-sm">
                    <span>{j.nom}</span>
                    <span className="font-medium text-frmt-green">
                      {j.total.toLocaleString("fr-FR")} MAD
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <h3 className="font-semibold mb-4">Réservations par court</h3>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {data.statsParCourt.map((c) => (
                <div
                  key={c.nom}
                  className="flex justify-between rounded-lg bg-surface-elevated px-3 py-2 text-sm"
                >
                  <span>{c.nom}</span>
                  <span className="font-medium">{c.reservations}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}

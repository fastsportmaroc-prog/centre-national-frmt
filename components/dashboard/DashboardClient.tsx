"use client";

import { useEffect, useState } from "react";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getDashboardStats } from "@/lib/data/dashboard";
import { getReservationsWithRelations } from "@/lib/data/reservations";
import type { DashboardStats, ReservationWithRelations } from "@/lib/types/database";
import { formatDateTime } from "@/lib/utils/dates";
import { PerformancesDashboardSection } from "@/components/performances/PerformancesDashboardSection";
import { CneDashboardSection } from "@/components/dashboard/CneDashboardSection";
import { InsightsAlertsSection } from "@/components/dashboard/InsightsAlertsSection";
import { FrmtProductionDashboard } from "@/components/dashboard/FrmtProductionDashboard";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FrmtProductionDashboard } from "@/components/dashboard/FrmtProductionDashboard";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { FadeIn } from "@/components/motion/FadeIn";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { versionLabel } from "@/lib/version";
import { CalendarCheck, MapPin, Percent, Users } from "lucide-react";

export function DashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcoming, setUpcoming] = useState<ReservationWithRelations[]>([]);

  useEffect(() => {
    Promise.all([getDashboardStats(), getReservationsWithRelations()]).then(
      ([s, res]) => {
        setStats(s);
        setUpcoming(res.filter((r) => r.statut !== "annulee").slice(0, 5));
      }
    );
  }, []);

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description={`Centre National FRMT — vue d'ensemble · ${versionLabel()}`}
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <FadeIn>
          <DashboardHero />
        </FadeIn>
        {isSupabaseConfigured() && <FrmtProductionDashboard />}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats ? (
            <>
              <FadeIn delay={0.05}>
                <StatCard label="Joueurs inscrits" value={stats.totalJoueurs} icon={Users} />
              </FadeIn>
              <FadeIn delay={0.1}>
                <StatCard label="Courts actifs" value={stats.courtsActifs} icon={MapPin} />
              </FadeIn>
              <FadeIn delay={0.15}>
                <StatCard
                  label="Réservations aujourd'hui"
                  value={stats.reservationsAujourdhui}
                  icon={CalendarCheck}
                />
              </FadeIn>
              <FadeIn delay={0.2}>
                <StatCard
                  label="Taux d'occupation"
                  value={`${stats.tauxOccupation}%`}
                  hint="Estimation sur la journée"
                  icon={Percent}
                />
              </FadeIn>
            </>
          ) : (
            <p className="col-span-full text-sm text-muted">Chargement…</p>
          )}
        </div>
        <CneDashboardSection />
        <PerformancesDashboardSection />

        <Card premium>
          <h2 className="mb-4 text-lg font-semibold">Prochaines réservations</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Aucune réservation à afficher.</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {r.joueur?.prenom} {r.joueur?.nom} — {r.court?.nom}
                    </p>
                    <p className="text-sm text-muted">
                      {formatDateTime(r.date_debut)} → {formatDateTime(r.date_fin)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      r.statut === "confirmee"
                        ? "success"
                        : r.statut === "en_attente"
                          ? "warning"
                          : "muted"
                    }
                  >
                    {r.statut === "confirmee"
                      ? "Confirmée"
                      : r.statut === "en_attente"
                        ? "En attente"
                        : "Annulée"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}

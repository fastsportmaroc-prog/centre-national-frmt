"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getAnalyticsDashboard } from "@/lib/data/analytics";
import { getFrmtInsights } from "@/lib/insights/frmt-insights";
import type { AnalyticsDashboard } from "@/lib/types/analytics";
import type { FrmtInsight } from "@/lib/insights/frmt-insights";
import {
  AlertTriangle,
  BedDouble,
  Plane,
  Trophy,
  Users,
  Wallet,
  Wrench,
  BarChart3,
} from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";

export function FrmtProductionDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [insights, setInsights] = useState<FrmtInsight[]>([]);

  useEffect(() => {
    Promise.all([getAnalyticsDashboard(), getFrmtInsights()]).then(([a, i]) => {
      setAnalytics(a);
      setInsights(i);
    });
  }, []);

  if (!analytics) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} premium className="h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">
          Pilotage Centre National
        </h2>
        <Badge variant="success">Données Supabase en direct</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FadeIn delay={0.03}>
          <StatCard label="Joueurs actifs" value={analytics.joueursActifs} icon={Users} />
        </FadeIn>
        <FadeIn delay={0.06}>
          <StatCard label="Stages actifs" value={analytics.stagesActifs} icon={Trophy} />
        </FadeIn>
        <FadeIn delay={0.09}>
          <StatCard
            label="Occupation courts"
            value={`${analytics.tauxOccupationCourts}%`}
            icon={BarChart3}
          />
        </FadeIn>
        <FadeIn delay={0.12}>
          <StatCard
            label="Chambres occupées"
            value={`${analytics.chambresOccupees}/${analytics.chambresTotal}`}
            icon={BedDouble}
          />
        </FadeIn>
        <FadeIn delay={0.15}>
          <StatCard
            label="Budget mensuel (réel)"
            value={`${analytics.budgetMensuelMAD.toLocaleString("fr-FR")} MAD`}
            icon={Wallet}
          />
        </FadeIn>
        <FadeIn delay={0.18}>
          <StatCard
            label="Stock matériel faible"
            value={analytics.materielStockFaible}
            hint={analytics.materielStockFaible > 0 ? "À réapprovisionner" : "OK"}
            icon={Wrench}
          />
        </FadeIn>
        <FadeIn delay={0.21}>
          <StatCard
            label="Logistique en attente"
            value={analytics.demandesLogistiqueEnAttente}
            icon={Plane}
          />
        </FadeIn>
        <FadeIn delay={0.24}>
          <StatCard
            label="Budgets déplacement validés"
            value={analytics.budgetsDeplacementValides}
            icon={Wallet}
          />
        </FadeIn>
      </div>

      {insights.length > 0 && (
        <Card premium className="p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Alertes prioritaires
          </p>
          <ul className="space-y-2">
            {insights.slice(0, 5).map((ins) => (
              <li key={ins.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <strong>{ins.title}</strong> — {ins.message}
                </span>
                {ins.href && (
                  <Link href={ins.href} className="text-frmt-green text-xs hover:underline">
                    Voir →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

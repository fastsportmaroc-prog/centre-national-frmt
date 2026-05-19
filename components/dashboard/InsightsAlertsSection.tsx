"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/motion/FadeIn";
import { getFrmtInsights, type FrmtInsight } from "@/lib/insights/frmt-insights";
import { Sparkles } from "lucide-react";

function levelVariant(level: FrmtInsight["level"]) {
  if (level === "error") return "danger" as const;
  if (level === "warn") return "warning" as const;
  return "muted" as const;
}

export function InsightsAlertsSection() {
  const [insights, setInsights] = useState<FrmtInsight[]>([]);

  useEffect(() => {
    getFrmtInsights().then(setInsights);
  }, []);

  if (insights.length === 0) return null;

  return (
    <FadeIn>
      <Card className="border-frmt-green/20 bg-gradient-to-br from-frmt-green/5 to-transparent p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-frmt-green" />
          <h2 className="text-lg font-semibold">Alertes & suggestions</h2>
        </div>
        <ul className="space-y-2">
          {insights.map((i) => (
            <li
              key={i.id}
              className="flex flex-col gap-1 rounded-lg border border-border/60 bg-surface/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={levelVariant(i.level)}>{i.level}</Badge>
                  <span className="font-medium text-sm">{i.title}</span>
                </div>
                <p className="text-sm text-muted mt-0.5">{i.message}</p>
              </div>
              {i.href && (
                <Link href={i.href} className="text-xs text-frmt-green hover:underline shrink-0">
                  Voir →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </FadeIn>
  );
}

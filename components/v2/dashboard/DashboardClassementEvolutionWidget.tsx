"use client";

import Link from "next/link";
import { ClassementInternationalEvolutionChart } from "@/components/v2/classement-national/ClassementInternationalEvolutionChart";

export function DashboardClassementEvolutionWidget() {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-[var(--text-muted)]">
          Historique scrapé ATP/WTA (joueurs CNE)
        </p>
        <Link
          href="/v2/classement-national-maroc"
          className="text-[11px] font-medium text-[var(--frmt-green,#16a34a)] hover:underline"
        >
          Classement International →
        </Link>
      </div>
      <ClassementInternationalEvolutionChart compact />
    </section>
  );
}

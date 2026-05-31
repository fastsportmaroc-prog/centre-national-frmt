"use client";

import Link from "next/link";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Card } from "@/components/ui/Card";
import { Plane, Trophy } from "lucide-react";

const RUBRIQUES = [
  {
    href: "/v2/budget/stages-cne",
    title: "Coût des stages — CNE",
    description:
      "Stages déjà créés : estimation MAD (hébergement, restauration, terrains) = onglet Budget de la fiche stage, tarifs Paramètres.",
    icon: Trophy,
    accent: "text-emerald-400",
  },
  {
    href: "/v2/budget/voyage-competition",
    title: "Budget voyage — Compétitions",
    description:
      "Prévisionnels voyage en EUR ou MAD (conversion), export PDF, liaison optionnelle à une fiche compétition.",
    icon: Plane,
    accent: "text-sky-400",
  },
] as const;

export function BudgetHubV2Client() {
  return (
    <>
      <V2PageHeader
        title="Budget administratif"
        description="Stages CNE en MAD · Compétitions en EUR/MAD — liés aux fiches déjà créées"
      />
      <main className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
        {RUBRIQUES.map((r) => {
          const Icon = r.icon;
          return (
            <Link key={r.href} href={r.href} className="block h-full">
              <Card className="flex h-full flex-col gap-3 p-5 transition hover:border-[var(--frmt-gold)]/50">
                <Icon className={`h-8 w-8 ${r.accent}`} aria-hidden />
                <h2 className="text-lg font-semibold">{r.title}</h2>
                <p className="flex-1 text-sm text-muted">{r.description}</p>
                <span className="text-sm font-medium text-[var(--frmt-gold)]">Ouvrir →</span>
              </Card>
            </Link>
          );
        })}
      </main>
    </>
  );
}

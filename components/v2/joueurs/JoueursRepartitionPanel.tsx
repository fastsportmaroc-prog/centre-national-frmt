"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { JoueurV2 } from "@/lib/types/v2";
import {
  buildRepartitionByCategory,
  buildRepartitionByClub,
  buildRepartitionBySexe,
  buildRepartitionByStatut,
  buildRepartitionStages,
  joueurDocsComplete,
  type RepartitionRow,
} from "@/components/v2/joueurs/joueurs-display-stats";
import { UsersRound, FileCheck2, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function BarList({ title, rows, emptyLabel }: { title: string; rows: RepartitionRow[]; emptyLabel?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Card className="flex h-full flex-col border border-border/80 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{emptyLabel ?? "Aucune donnée"}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{r.label}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  {r.count} <span className="text-[11px]">({r.pct}%)</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                <div
                  className="h-full rounded-full bg-frmt-green transition-all"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

type Props = {
  joueurs: JoueurV2[];
  stageCounts: Record<string, number>;
};

export function JoueursRepartitionPanel({ joueurs, stageCounts }: Props) {
  const byCategory = buildRepartitionByCategory(joueurs);
  const bySexe = buildRepartitionBySexe(joueurs);
  const byStatut = buildRepartitionByStatut(joueurs);
  const byClub = buildRepartitionByClub(joueurs);
  const byStages = buildRepartitionStages(joueurs, stageCounts);
  const total = joueurs.length || 1;
  const docsOk = joueurs.filter(joueurDocsComplete).length;
  const docsMissing = joueurs.length - docsOk;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 border border-emerald-500/25 bg-emerald-500/5 p-4">
        <div>
          <p className="text-sm font-medium text-emerald-200">Répartition par stage</p>
          <p className="mt-0.5 text-xs text-muted">
            Vue détaillée des effectifs par stage, catégorie et année de naissance.
          </p>
        </div>
        <Link
          href="/v2/groupes"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-zinc-800"
        >
          <UsersRound className="h-4 w-4" />
          Ouvrir Groupes & effectifs
        </Link>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-sky-500/25 bg-sky-500/5 p-4">
          <p className="text-xs uppercase tracking-wider text-sky-200/90">Masculin</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-sky-100">{bySexe.M}</p>
          <p className="text-xs text-muted">{Math.round((bySexe.M / total) * 100)}% du filtre</p>
        </Card>
        <Card className="border border-pink-500/25 bg-pink-500/5 p-4">
          <p className="text-xs uppercase tracking-wider text-pink-200/90">Féminin</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-pink-100">{bySexe.F}</p>
          <p className="text-xs text-muted">{Math.round((bySexe.F / total) * 100)}% du filtre</p>
        </Card>
        <Card className="border border-emerald-500/25 bg-emerald-500/5 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-emerald-200/90">
            <FileCheck2 className="h-3.5 w-3.5" />
            Dossier complet
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-100">{docsOk}</p>
          <p className="text-xs text-muted">Passeport + expiration renseignés</p>
        </Card>
        <Card className="border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-200/90">
            <FileWarning className="h-3.5 w-3.5" />
            À compléter
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-100">{docsMissing}</p>
          <p className="text-xs text-muted">Informations passeport manquantes</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <BarList title="Par catégorie d'âge" rows={byCategory} />
        <BarList title="Par statut" rows={byStatut} />
        <BarList title="Implication stages" rows={byStages} />
        <div className="lg:col-span-2 xl:col-span-2">
          <BarList title="Par club d'origine (top 12)" rows={byClub} emptyLabel="Aucun club renseigné" />
        </div>
      </div>

      {bySexe.autre > 0 ? (
        <p className={cn("text-center text-xs text-muted")}>
          {bySexe.autre} joueur(s) sans sexe renseigné dans le filtre actuel.
        </p>
      ) : null}
    </div>
  );
}

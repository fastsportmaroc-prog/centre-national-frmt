"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { PerformancesNav } from "./PerformancesNav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getPerformancesDashboard } from "@/lib/data/performances";
import { syncMoroccanPerformances } from "@/lib/tennis/sync-service";
import { fetchTennisApiStatus } from "@/lib/tennis/tennis-api-client";
import { CIRCUIT_LABELS } from "@/lib/constants/performances";
import type { PerformancesDashboard } from "@/lib/types/performances";
import { formatDate } from "@/lib/utils/dates";
import { RefreshCw, Trophy, TrendingUp } from "lucide-react";
import { MOROCCO_NATIONALITY } from "@/lib/tennis/morocco-filter";

export function PerformancesMarocainsClient() {
  const [data, setData] = useState<PerformancesDashboard | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [dataMode, setDataMode] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const load = () => getPerformancesDashboard().then(setData);

  useEffect(() => {
    fetchTennisApiStatus().then(async (s) => {
      setDataMode(s.modeLabel);
      if (s.mode === "dataset" || s.mode === "demo") {
        try {
          await syncMoroccanPerformances();
        } catch {
          /* ignore auto-sync */
        }
      }
      await load();
    });
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await syncMoroccanPerformances();
      if (result.mode === "live_api" && result.joueurs_marocains === 0) {
        setSyncError(
          "Aucun joueur Maroc dans les classements ATP/WTA. Vérifiez votre abonnement api-tennis.com."
        );
      }
      await load();
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : "Synchronisation impossible");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Résultats internationaux Marocains"
        description={`Uniquement joueurs ${MOROCCO_NATIONALITY} (MAR / FRMT) — ATP, WTA, ITF, Juniors, Futures, Challengers`}
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <PerformancesNav />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-frmt-green/30 bg-frmt-green/5 px-4 py-3 text-sm">
          <div>
            <p className="text-muted">
              Filtre actif : <strong className="text-frmt-green">country_code = MAR</strong>
              {" · "}Adversaires étrangers = données de match uniquement.
            </p>
            {dataMode && (
              <p className="mt-1 text-xs text-frmt-green">
                Mode actif : <strong>{dataMode}</strong>
                {" · "}
                <code className="rounded bg-surface-elevated px-1">TENNIS_DATA_MODE</code>
                = demo | dataset | live_api
              </p>
            )}
            <p className="mt-1 text-xs text-muted">
              Par défaut : dataset gratuit <code>/data/tennis</code> (joueurs marocains réels).
              API payante uniquement si{" "}
              <code>TENNIS_DATA_MODE=live_api</code>.
            </p>
            {syncError && <p className="mt-1 text-xs text-red-400">{syncError}</p>}
          </div>
          <div className="flex items-center gap-2">
            {data?.derniere_sync && (
              <span className="text-xs text-muted">
                {data.provider} — {formatDate(data.derniere_sync)}
              </span>
            )}
            <Button size="sm" variant="secondary" disabled={syncing} onClick={handleSync}>
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Synchroniser
            </Button>
          </div>
        </div>

        {!data ? (
          <p className="text-muted">Chargement…</p>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <h3 className="mb-3 font-semibold text-frmt-red">Meilleurs ATP / Challenger</h3>
                <ul className="space-y-2">
                  {data.topAtpHommes.map(({ joueur, ranking }) => (
                    <li key={ranking.id}>
                      <Link
                        href={`/performances/joueurs/${joueur.id}`}
                        className="flex justify-between text-sm hover:text-frmt-green"
                      >
                        <span>
                          {joueur.prenom} {joueur.nom}
                        </span>
                        <span className="font-medium">#{ranking.rang}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h3 className="mb-3 font-semibold text-frmt-green">Meilleures WTA</h3>
                <ul className="space-y-2">
                  {data.topWtaFemmes.map(({ joueur, ranking }) => (
                    <li key={ranking.id}>
                      <Link
                        href={`/performances/joueurs/${joueur.id}`}
                        className="flex justify-between text-sm hover:text-frmt-green"
                      >
                        <span>
                          {joueur.prenom} {joueur.nom}
                        </span>
                        <span className="font-medium">#{ranking.rang}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h3 className="mb-3 font-semibold">Meilleurs juniors ITF</h3>
                <ul className="space-y-2">
                  {data.topJuniorsItf.map(({ joueur, ranking }) => (
                    <li key={ranking.id}>
                      <Link
                        href={`/performances/joueurs/${joueur.id}`}
                        className="flex justify-between text-sm hover:text-frmt-green"
                      >
                        <span>
                          {joueur.prenom} {joueur.nom}
                        </span>
                        <span className="font-medium">#{ranking.rang}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h3 className="mb-3 flex items-center gap-2 font-semibold">
                  <Trophy className="h-4 w-4 text-frmt-green" />
                  Résultats récents
                </h3>
                <ul className="space-y-2 text-sm">
                  {data.resultatsRecents.map((m) => (
                    <li key={m.id} className="rounded-lg border border-border p-2">
                      <p className="font-medium">
                        {m.tournoi} — {m.tour}
                      </p>
                      <p className="text-muted">
                        vs {m.adversaire.nom} ({m.adversaire.pays}) · {m.score}
                      </p>
                      <Badge variant={m.resultat === "victoire" ? "success" : "muted"}>
                        {m.resultat}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h3 className="mb-3 font-semibold">Prochains matchs</h3>
                <ul className="space-y-2 text-sm">
                  {data.prochainsMatchs.map((m) => (
                    <li key={m.id} className="rounded-lg border border-border p-2">
                      <p className="font-medium">{m.tournoi}</p>
                      <p className="text-muted">
                        {formatDate(m.date_prevue)} · vs {m.adversaire.nom} (
                        {m.adversaire.pays})
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <TrendingUp className="h-4 w-4 text-frmt-green" />
                Progression classement
              </h3>
              <ul className="flex flex-wrap gap-3">
                {data.progressions.map((p) => (
                  <li
                    key={p.joueur.id}
                    className="rounded-lg bg-surface-elevated px-3 py-2 text-sm"
                  >
                    <Link href={`/performances/joueurs/${p.joueur.id}`} className="hover:text-frmt-green">
                      {p.joueur.prenom} {p.joueur.nom}
                    </Link>
                    <span className="ml-2 text-frmt-green">+{p.variation}</span>
                    <span className="text-muted ml-1">({CIRCUIT_LABELS[p.circuit]})</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h3 className="mb-3 font-semibold">Palmarès marocain</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {data.palmaresMaroc.map((p) => (
                  <li key={p.id} className="text-sm rounded-lg border border-border p-2">
                    <strong>{p.tournoi}</strong> ({p.annee}) — {p.resultat}
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </main>
    </>
  );
}

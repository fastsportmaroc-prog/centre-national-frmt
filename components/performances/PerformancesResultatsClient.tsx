"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { PerformancesNav } from "./PerformancesNav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getResultatsRecentsMarocains, getMoroccanTrackedJoueurs } from "@/lib/data/performances";
import { CIRCUIT_LABELS } from "@/lib/constants/performances";
import type { MatchPerformance } from "@/lib/types/performances";
import type { Joueur } from "@/lib/types/database";
import { formatDate } from "@/lib/utils/dates";

export function PerformancesResultatsClient() {
  const [matchs, setMatchs] = useState<MatchPerformance[]>([]);
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);

  useEffect(() => {
    Promise.all([getResultatsRecentsMarocains(), getMoroccanTrackedJoueurs()]).then(
      ([m, j]) => {
        setMatchs(m);
        setJoueurs(j);
      }
    );
  }, []);

  const joueurNom = (id: string) => {
    const j = joueurs.find((x) => x.id === id);
    return j ? `${j.prenom} ${j.nom}` : "—";
  };

  return (
    <>
      <PageHeader
        title="Résultats récents"
        description="Matchs des joueurs marocains — adversaires en données de match uniquement"
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <PerformancesNav />
        {matchs.length === 0 ? (
          <p className="text-muted">Chargement…</p>
        ) : (
          <ul className="space-y-3">
            {matchs.map((m) => (
              <li key={m.id}>
                <Card>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link
                        href={`/performances/joueurs/${m.joueur_id}`}
                        className="text-sm font-medium text-frmt-green hover:underline"
                      >
                        {joueurNom(m.joueur_id)}
                      </Link>
                      <p className="font-semibold">
                        {m.tournoi} — {m.tour}
                      </p>
                      <p className="text-sm text-muted">
                        {formatDate(m.date_match)} · {CIRCUIT_LABELS[m.circuit]} · {m.surface}
                      </p>
                      <p className="mt-1 text-sm">
                        vs{" "}
                        <strong>{m.adversaire.nom}</strong> ({m.adversaire.pays}
                        {m.adversaire.classement ? ` · ${m.adversaire.classement}` : ""})
                      </p>
                      <p className="text-sm font-medium">{m.score}</p>
                    </div>
                    <Badge variant={m.resultat === "victoire" ? "success" : "muted"}>
                      {m.resultat}
                    </Badge>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

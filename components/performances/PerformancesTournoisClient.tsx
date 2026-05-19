"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { PerformancesNav } from "./PerformancesNav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getAllTournoisMarocains } from "@/lib/data/performances";
import { CIRCUIT_LABELS } from "@/lib/constants/performances";
import type { Joueur } from "@/lib/types/database";
import type { TournoiJoueur } from "@/lib/types/performances";
import { formatDate } from "@/lib/utils/dates";

const statutLabel: Record<TournoiJoueur["statut"], string> = {
  a_venir: "À venir",
  en_cours: "En cours",
  termine: "Terminé",
};

export function PerformancesTournoisClient() {
  const [rows, setRows] = useState<{ joueur: Joueur; tournois: TournoiJoueur[] }[]>([]);

  useEffect(() => {
    getAllTournoisMarocains().then(setRows);
  }, []);

  return (
    <>
      <PageHeader
        title="Tournois — joueurs marocains"
        description="Historique et calendrier tournois internationaux FRMT"
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <PerformancesNav />
        {rows.length === 0 ? (
          <p className="text-muted">Chargement…</p>
        ) : (
          <ul className="space-y-4">
            {rows.flatMap(({ joueur, tournois }) =>
              tournois.map((t) => (
                <li key={t.id}>
                  <Card className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Link
                        href={`/performances/joueurs/${joueur.id}`}
                        className="font-medium hover:text-frmt-green"
                      >
                        {joueur.prenom} {joueur.nom}
                      </Link>
                      <p className="text-lg font-semibold">{t.nom}</p>
                      <p className="text-sm text-muted">
                        {t.ville}, {t.pays} · {CIRCUIT_LABELS[t.circuit]} · {t.surface}
                      </p>
                      <p className="text-sm text-muted">
                        {formatDate(t.date_debut)} → {formatDate(t.date_fin)}
                      </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <Badge
                        variant={
                          t.statut === "en_cours"
                            ? "success"
                            : t.statut === "a_venir"
                              ? "warning"
                              : "muted"
                        }
                      >
                        {statutLabel[t.statut]}
                      </Badge>
                      {t.meilleur_tour && (
                        <span className="text-sm">Meilleur tour : {t.meilleur_tour}</span>
                      )}
                    </div>
                  </Card>
                </li>
              ))
            )}
          </ul>
        )}
      </main>
    </>
  );
}

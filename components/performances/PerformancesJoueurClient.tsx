"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { PerformancesNav } from "./PerformancesNav";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getPerformancesJoueur } from "@/lib/data/performances";
import { CIRCUIT_LABELS } from "@/lib/constants/performances";
import type { PerformancesJoueur } from "@/lib/types/performances";
import { formatDate } from "@/lib/utils/dates";
import { ArrowLeft } from "lucide-react";
import {
  MOROCCO_COUNTRY_CODE,
  MOROCCO_FEDERATION,
  MOROCCO_NATIONALITY,
} from "@/lib/tennis/morocco-filter";

export function PerformancesJoueurClient() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [data, setData] = useState<PerformancesJoueur | null>(null);

  useEffect(() => {
    if (id) getPerformancesJoueur(id).then(setData);
  }, [id]);

  if (!data && id) {
    return (
      <main className="p-6">
        <p className="text-muted">Chargement…</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="p-6">
        <p className="text-muted">Joueur marocain introuvable ou non suivi FRMT.</p>
        <Link href="/performances/marocains" className="mt-4 inline-flex text-frmt-green">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Retour
        </Link>
      </main>
    );
  }

  const { joueur } = data;

  return (
    <>
      <PageHeader
        title={`${joueur.prenom} ${joueur.nom}`}
        description={`${MOROCCO_NATIONALITY} · ${MOROCCO_COUNTRY_CODE} · ${MOROCCO_FEDERATION}`}
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/performances/marocains"
            className="inline-flex items-center text-sm text-frmt-green hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Résultats internationaux
          </Link>
          <PerformancesNav />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <h3 className="mb-3 font-semibold">Classements</h3>
            <ul className="space-y-2 text-sm">
              {data.rankings.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <span>{CIRCUIT_LABELS[r.circuit]}</span>
                  <span className="font-medium">#{r.rang}</span>
                  <span>{r.points} pts</span>
                  {r.variation != null && (
                    <span className={r.variation >= 0 ? "text-frmt-green" : "text-frmt-red"}>
                      {r.variation >= 0 ? "+" : ""}
                      {r.variation}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="mb-3 font-semibold">IDs externes</h3>
            <dl className="space-y-1 text-xs text-muted">
              {joueur.external_atp_id && (
                <>
                  <dt>ATP</dt>
                  <dd className="text-foreground">{joueur.external_atp_id}</dd>
                </>
              )}
              {joueur.external_wta_id && (
                <>
                  <dt>WTA</dt>
                  <dd className="text-foreground">{joueur.external_wta_id}</dd>
                </>
              )}
              {joueur.external_itf_id && (
                <>
                  <dt>ITF</dt>
                  <dd className="text-foreground">{joueur.external_itf_id}</dd>
                </>
              )}
              {joueur.external_itf_junior_id && (
                <>
                  <dt>ITF Junior</dt>
                  <dd className="text-foreground">{joueur.external_itf_junior_id}</dd>
                </>
              )}
            </dl>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-3 font-semibold">Matchs récents</h3>
            <ul className="space-y-2 text-sm">
              {data.matchs_recents.map((m) => (
                <li key={m.id} className="rounded-lg border border-border p-2">
                  <p className="font-medium">
                    {m.tournoi} — {m.score}
                  </p>
                  <p className="text-muted">
                    vs {m.adversaire.nom} ({m.adversaire.pays})
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
              {data.prochains_matchs.map((m) => (
                <li key={m.id} className="rounded-lg border border-border p-2">
                  <p className="font-medium">{m.tournoi}</p>
                  <p className="text-muted">
                    {formatDate(m.date_prevue)} · vs {m.adversaire.nom}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card>
          <h3 className="mb-3 font-semibold">Stats par surface</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {data.stats_surfaces.map((s) => (
              <div
                key={s.surface}
                className="rounded-lg border border-border p-3 text-center text-sm"
              >
                <p className="font-medium">{s.surface}</p>
                <p>
                  {s.victoires}V / {s.defaites}D ({s.matchs} matchs)
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Évolution classement</h3>
          <ul className="flex flex-wrap gap-2 text-xs">
            {data.evolution.map((e, i) => (
              <li key={i} className="rounded bg-surface-elevated px-2 py-1">
                {formatDate(e.date)} · {CIRCUIT_LABELS[e.circuit]} #{e.rang}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Palmarès</h3>
          <ul className="space-y-1 text-sm">
            {data.palmares.map((p) => (
              <li key={p.id}>
                {p.annee} — {p.tournoi} ({CIRCUIT_LABELS[p.circuit]}) : {p.resultat}
              </li>
            ))}
          </ul>
        </Card>
      </main>
    </>
  );
}

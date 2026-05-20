"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { FRMT_BIRTH_YEARS } from "@/lib/frmt/classement-scope";
import type { FrmtYearSexeGroup } from "@/lib/frmt/classement-scope";
import type { FrmtClassementPlayer } from "@/lib/frmt/classement-to-joueurs";
import type { JoueurWithGroupe } from "@/lib/types/database";
import { ExternalLink, Trophy } from "lucide-react";

type FrmtApiPayload = {
  source: string;
  fetchedAt: string;
  classementDate?: string | null;
  total: number;
  garcons: number;
  filles: number;
  groups: FrmtYearSexeGroup[];
};

type Props = {
  joueurs: JoueurWithGroupe[];
  loading?: boolean;
  refreshKey?: number;
  onEdit?: (j: JoueurWithGroupe) => void;
};

function matchJoueur(
  joueurs: JoueurWithGroupe[],
  p: FrmtClassementPlayer
): JoueurWithGroupe | undefined {
  return joueurs.find(
    (j) =>
      j.is_frmt_tracked &&
      j.nom.toLowerCase() === p.nom.toLowerCase() &&
      j.prenom.toLowerCase() === p.prenom.toLowerCase() &&
      j.date_naissance.startsWith(String(p.annee_naissance))
  );
}

function PlayerRow({
  p,
  linked,
  onEdit,
}: {
  p: FrmtClassementPlayer;
  linked?: JoueurWithGroupe;
  onEdit?: (j: JoueurWithGroupe) => void;
}) {
  const varLabel =
    p.variation != null && !Number.isNaN(p.variation)
      ? ` · ${p.variation >= 0 ? "+" : ""}${p.variation} clt`
      : "";

  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tennis/15 text-sm font-bold text-tennis">
        #{p.rang_categorie}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">
          {p.prenom} {p.nom}
        </span>
        <span className="block truncate text-xs text-muted">
          {p.classement_national}e national · {p.points} pts · {p.club}
          {varLabel}
        </span>
        {linked && (
          <span className="mt-0.5 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
            En base
          </span>
        )}
      </span>
    </>
  );

  if (linked && onEdit) {
    return (
      <li>
        <button
          type="button"
          onClick={() => onEdit(linked)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-elevated/60"
        >
          {content}
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {content}
    </li>
  );
}

export function JoueursFrmtClassement({
  joueurs,
  loading: loadingJoueurs,
  refreshKey = 0,
  onEdit,
}: Props) {
  const [api, setApi] = useState<FrmtApiPayload | null>(null);
  const [loadingApi, setLoadingApi] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingApi(true);
      setApiError(null);
      try {
        const res = await fetch("/api/frmt/classement");
        if (!res.ok) throw new Error("Impossible de charger le classement FRMT");
        const data = (await res.json()) as FrmtApiPayload;
        if (!cancelled) setApi(data);
      } catch (e) {
        if (!cancelled)
          setApiError(e instanceof Error ? e.message : "Erreur chargement FRMT");
      } finally {
        if (!cancelled) setLoadingApi(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const groupsByYear = useMemo(() => {
    const map = new Map<number, FrmtYearSexeGroup[]>();
    for (const g of api?.groups ?? []) {
      const list = map.get(g.annee) ?? [];
      list.push(g);
      map.set(g.annee, list);
    }
    return map;
  }, [api?.groups]);

  const inDb = useMemo(
    () =>
      (api?.players ?? []).filter((p) => matchJoueur(joueurs, p)).length,
    [api?.players, joueurs]
  );

  if (loadingJoueurs || loadingApi) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Chargement du classement FRMT…
      </p>
    );
  }

  if (apiError) {
    return (
      <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
        {apiError}
      </p>
    );
  }

  const total = api?.total ?? 0;

  return (
    <div className="space-y-8">
      <Card className="border-tennis/20 bg-surface-elevated/40 p-4">
        <p className="text-sm text-foreground">
          <strong>{total}</strong> joueurs dans le fichier WB27
          {api?.classementDate ? ` · date classement ${api.classementDate}` : ""}
          {api?.fetchedAt
            ? ` · importé le ${new Date(api.fetchedAt).toLocaleString("fr-FR")}`
            : ""}
        </p>
        <p className="mt-1 text-xs text-muted">
          {inDb} déjà en base · cliquez <strong>Intégrer classement FRMT</strong> en haut pour
          ajouter ou mettre à jour les classements
        </p>
        <a
          href="https://info.frmt.ma/FRMT_CLASSEMENT_WB27"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-tennis hover:underline"
        >
          Source officielle FRMT
          <ExternalLink className="h-3 w-3" />
        </a>
      </Card>

      {total === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">
          <p className="mb-2">Aucune donnée dans le fichier local.</p>
          <p>
            1. Lancez <code className="rounded bg-surface px-1">IMPORT-FRMT-CLASSEMENT.bat</code>
            <br />
            2. Rechargez cette page (F5)
            <br />
            3. Puis <strong>Sync FRMT (WB27)</strong> pour enregistrer en base
          </p>
        </Card>
      ) : (
        FRMT_BIRTH_YEARS.map((year) => {
          const yearGroups = groupsByYear.get(year) ?? [];
          const garcons = yearGroups.find((g) => g.sexe === "M");
          const filles = yearGroups.find((g) => g.sexe === "F");
          const filled =
            (garcons?.players.length ?? 0) + (filles?.players.length ?? 0);

          return (
            <section key={year} className="space-y-4">
              <h2 className="flex items-center gap-2 border-b border-border pb-2 text-xl font-semibold text-foreground">
                <Trophy className="h-5 w-5 text-tennis" />
                Nés en {year}
                <span className="text-sm font-normal text-muted">
                  ({filled}/10 places)
                </span>
              </h2>

              <div className="grid gap-4 lg:grid-cols-2">
                {(["M", "F"] as const).map((sexe) => {
                  const block = sexe === "M" ? garcons : filles;
                  const list = block?.players ?? [];
                  const title = sexe === "M" ? "Garçons" : "Filles";

                  return (
                    <Card key={`${year}-${sexe}`} className="overflow-hidden p-0">
                      <div className="border-b border-border bg-surface-elevated/80 px-4 py-2.5">
                        <h3 className="font-semibold text-foreground">{title}</h3>
                        <p className="text-xs text-muted">Top 5 — WB27</p>
                      </div>
                      {list.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-muted">
                          Pas de données pour cette catégorie.
                        </p>
                      ) : (
                        <ol className="divide-y divide-border">
                          {list.map((p) => (
                            <PlayerRow
                              key={`${p.frmt_filter}-${p.rang_categorie}-${p.nom}`}
                              p={p}
                              linked={matchJoueur(joueurs, p)}
                              onEdit={onEdit}
                            />
                          ))}
                        </ol>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type {
  ClassementMarocCategorie,
  ClassementMarocDiscipline,
  ClassementMarocHistoryPoint,
  ClassementMarocType,
  ClassementMarocWithHistory,
} from "@/lib/types/classements-maroc-scrapes";
import { playerKey as buildPlayerKey } from "@/lib/classements-maroc-scrapes/player-key";
import { ClassementInternationalEvolutionChart } from "@/components/v2/classement-national/ClassementInternationalEvolutionChart";

const CATEGORIES: { value: ClassementMarocCategorie; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "ATP", label: "ATP" },
  { value: "WTA", label: "WTA" },
];

const DISCIPLINES: { value: ClassementMarocDiscipline; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "double", label: "Double" },
];

const BADGE_CLASS: Record<ClassementMarocType, string> = {
  ATP: "bg-[var(--frmt-navy,#0f172a)] text-white",
  WTA: "bg-[#c1272d] text-white",
};

function fmtSemaine(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

function fmtEvolution(n: number | null): string {
  if (n == null) return "—";
  if (n > 0) return `+${n}`;
  return String(n);
}

function fmtDeltaRang(n: number | null): { text: string; className: string } {
  if (n == null) return { text: "—", className: "text-[var(--text-muted)]" };
  if (n > 0) return { text: `▲ ${n}`, className: "text-emerald-600" };
  if (n < 0) return { text: `▼ ${Math.abs(n)}`, className: "text-red-600" };
  return { text: "=", className: "text-[var(--text-muted)]" };
}

function playerHistoryKey(row: ClassementMarocWithHistory): string {
  return buildPlayerKey(row);
}

export function ClassementNationalMarocClient() {
  const [categorie, setCategorie] = useState<ClassementMarocCategorie>("all");
  const [discipline, setDiscipline] = useState<ClassementMarocDiscipline>("simple");
  const [asOf, setAsOf] = useState<string>("");
  const [semaines, setSemaines] = useState<string[]>([]);
  const [semaineActive, setSemaineActive] = useState<string | null>(null);
  const [premierReleve, setPremierReleve] = useState<string | null>(null);
  const [messageIndisponible, setMessageIndisponible] = useState<string | null>(null);
  const [rows, setRows] = useState<ClassementMarocWithHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [historyCache, setHistoryCache] = useState<Record<string, ClassementMarocHistoryPoint[]>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (asOf) params.set("asOf", asOf);
      if (categorie !== "all") params.set("type", categorie);
      params.set("discipline", discipline);
      const res = await fetch(`/api/dashboard/classements-maroc-scrapes?${params}`);
      const json = (await res.json()) as {
        rows?: ClassementMarocWithHistory[];
        semaines?: string[];
        semaine_active?: string | null;
        premier_releve?: string | null;
        message_indisponible?: string | null;
        error?: string;
      };
      if (json.error) setError(json.error);
      setRows(json.rows ?? []);
      setSemaines(json.semaines ?? []);
      setSemaineActive(json.semaine_active ?? null);
      setPremierReleve(json.premier_releve ?? null);
      setMessageIndisponible(json.message_indisponible ?? null);
      setExpanded(null);
      setHistoryCache({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [categorie, asOf, discipline]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const list =
      categorie === "all" ? rows : rows.filter((r) => r.type_classement === categorie);
    return [...list].sort((a, b) => a.rang - b.rang);
  }, [rows, categorie]);

  const loadHistory = async (row: ClassementMarocWithHistory) => {
    const key = playerHistoryKey(row);
    if (historyCache[key]?.length) return;
    try {
      const res = await fetch(
        `/api/dashboard/classements-maroc-scrapes?historyKey=${encodeURIComponent(key)}`
      );
      const json = (await res.json()) as { historique?: ClassementMarocHistoryPoint[] };
      setHistoryCache((prev) => ({ ...prev, [key]: json.historique ?? [] }));
    } catch {
      setHistoryCache((prev) => ({ ...prev, [key]: [] }));
    }
  };

  const runSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/classements-maroc-scrapes/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        skipped?: boolean;
        messages?: string[];
        error?: string;
        total?: number;
      };
      if (!res.ok || json.error) {
        setMessage(json.error ?? "Échec du scrape");
      } else if (json.skipped) {
        setMessage(json.messages?.join(" · ") ?? "Semaine déjà en base");
      } else {
        setMessage(
          json.messages?.join(" · ") ?? `${json.total ?? 0} joueur(s) importé(s)`
        );
      }
      setAsOf("");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur sync");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Classement International
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            Joueurs seniors marocains classés ATP et WTA (sources officielles, relevés
            hebdomadaires). Naviguez dans l’historique réel. Les juniors ITF restent sur{" "}
            <Link href="/v2/dashboard" className="text-[var(--frmt-green,#16a34a)] hover:underline">
              Classements externes
            </Link>{" "}
            (RapidAPI / joueurs CNE).
          </p>
        </div>
        <button
          type="button"
          disabled={syncing}
          onClick={() => void runSync()}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--frmt-green,#16a34a)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          {syncing ? "Scrape…" : "Mettre à jour"}
        </button>
      </div>

      {message && (
        <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-muted)]">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      )}

      <ClassementInternationalEvolutionChart discipline={discipline} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategorie(c.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                categorie === c.value
                  ? "bg-[var(--frmt-green,#16a34a)] text-white"
                  : "bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {c.label}
            </button>
          ))}

          <span className="mx-1 h-4 w-px bg-[var(--border-subtle)]" aria-hidden />

          {DISCIPLINES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDiscipline(d.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                discipline === d.value
                  ? "bg-[var(--frmt-navy,#0f172a)] text-white"
                  : "bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {d.label}
            </button>
          ))}

          <label className="ml-auto flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>État au</span>
            <input
              type="date"
              value={asOf || semaineActive || ""}
              min={premierReleve ?? undefined}
              onChange={(e) => setAsOf(e.target.value)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text-primary)]"
            />
          </label>

          {semaines.length > 0 && (
            <select
              value={semaineActive ?? ""}
              onChange={(e) => setAsOf(e.target.value)}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-2 py-1 text-xs"
              title="Raccourci : choisir une semaine de relevé"
            >
              {semaines.map((s) => (
                <option key={s} value={s}>
                  Semaine du {fmtSemaine(s)}
                </option>
              ))}
            </select>
          )}
        </div>

        {semaineActive && !messageIndisponible && (
          <p className="text-[11px] text-[var(--text-muted)]">
            Relevé affiché : semaine du <strong>{fmtSemaine(semaineActive)}</strong>
            {asOf && asOf !== semaineActive && (
              <> (dernier disponible ≤ {fmtSemaine(asOf)})</>
            )}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              <tr>
                <th className="px-3 py-2 w-8" />
                <th className="px-3 py-2">Rang</th>
                <th className="px-3 py-2">Joueur</th>
                <th className="px-3 py-2">Âge</th>
                <th className="px-3 py-2">Points</th>
                <th className="px-3 py-2">Évol. off.</th>
                <th className="px-3 py-2">Δ sem.</th>
                <th className="px-3 py-2">CNE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-[var(--text-muted)]">
                    Chargement…
                  </td>
                </tr>
              ) : messageIndisponible ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-[var(--text-muted)]">
                    {messageIndisponible}
                    {premierReleve && (
                      <button
                        type="button"
                        className="mt-3 block w-full text-[var(--frmt-green,#16a34a)] hover:underline"
                        onClick={() => setAsOf(premierReleve)}
                      >
                        Afficher le premier relevé ({fmtSemaine(premierReleve)})
                      </button>
                    )}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-[var(--text-muted)]">
                    {discipline === "double"
                      ? "Aucun classement double pour cette date. Lancez le backfill doubles ou « Mettre à jour »."
                      : "Aucun classement pour cette date. Lancez « Mettre à jour » ou attendez le cron hebdomadaire."}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const key = row.id;
                  const histKey = playerHistoryKey(row);
                  const open = expanded === key;
                  const hist = historyCache[histKey] ?? row.historique;
                  const delta = fmtDeltaRang(row.delta_rang_semaine);
                  return (
                    <Fragment key={key}>
                      <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-elevated)]/50">
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              const next = open ? null : key;
                              setExpanded(next);
                              if (next) void loadHistory(row);
                            }}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            aria-label="Historique"
                          >
                            {open ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-2 font-semibold tabular-nums">{row.rang}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[9px] font-bold",
                                BADGE_CLASS[row.type_classement]
                              )}
                            >
                              {row.type_classement}
                            </span>
                            {row.joueur_cne_id ? (
                              <Link
                                href={`/v2/joueurs/${row.joueur_cne_id}`}
                                className="font-medium hover:text-[var(--frmt-green,#16a34a)]"
                              >
                                {row.nom_joueur}
                              </Link>
                            ) : (
                              <span className="font-medium">{row.nom_joueur}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 tabular-nums text-[var(--text-muted)]">
                          {row.age ?? "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{row.points ?? "—"}</td>
                        <td className="px-3 py-2 tabular-nums text-[var(--text-muted)]">
                          {fmtEvolution(row.evolution)}
                        </td>
                        <td className={cn("px-3 py-2 tabular-nums font-medium", delta.className)}>
                          {delta.text}
                        </td>
                        <td className="px-3 py-2">
                          {row.est_membre_cne ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                              Membre CNE
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              Hors CNE
                            </span>
                          )}
                        </td>
                      </tr>
                      {open && (
                        <tr key={`${key}-hist`} className="bg-[var(--surface-elevated)]/30">
                          <td colSpan={8} className="px-6 py-3">
                            <p className="mb-2 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                              Évolution du classement
                            </p>
                            {!hist.length ? (
                              <p className="text-[11px] text-[var(--text-muted)]">Chargement…</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {hist.map((h) => (
                                  <div
                                    key={h.semaine_releve}
                                    className={cn(
                                      "rounded-lg border px-2 py-1 text-[10px]",
                                      h.semaine_releve === row.semaine_releve
                                        ? "border-[var(--frmt-green,#16a34a)] bg-white"
                                        : "border-[var(--border-subtle)]"
                                    )}
                                  >
                                    <span className="text-[var(--text-muted)]">
                                      {fmtSemaine(h.semaine_releve)}
                                    </span>
                                    <span className="ml-2 font-bold tabular-nums">#{h.rang}</span>
                                    {h.points != null && (
                                      <span className="ml-1 text-[var(--text-muted)]">
                                        ({h.points} pts)
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

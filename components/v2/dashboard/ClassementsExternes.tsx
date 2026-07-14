"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type {
  ClassementExterneCategorie,
  ClassementExterneRow,
} from "@/lib/types/classements-externes";

type Props = {
  rows: ClassementExterneRow[];
  onSynced?: () => void;
};

type SyncMeta = {
  lastSyncAt: string | null;
  linesLastSync: number;
};

const CATEGORIES: { value: ClassementExterneCategorie; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "ATP", label: "ATP" },
  { value: "WTA", label: "WTA" },
  { value: "ITF Junior", label: "ITF Junior" },
];

const BADGE_CLASS: Record<string, string> = {
  ATP: "bg-[var(--frmt-navy,#0f172a)] text-white",
  WTA: "bg-[#c1272d] text-white",
  "ITF Junior": "bg-[var(--frmt-green,#16a34a)] text-white",
};

function fmtEvolution(n: number | null): { text: string; className: string } {
  if (n == null) return { text: "—", className: "text-[var(--text-muted)]" };
  if (n > 0) return { text: `▲ ${n}`, className: "text-emerald-600" };
  if (n < 0) return { text: `▼ ${Math.abs(n)}`, className: "text-red-600" };
  return { text: "=", className: "text-[var(--text-muted)]" };
}

function fmtDate(iso: string): string {
  try {
    return format(parseISO(iso), "dd/MM/yyyy HH:mm", { locale: fr });
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

export function ClassementsExternes({ rows, onSynced }: Props) {
  const [categorie, setCategorie] = useState<ClassementExterneCategorie>("all");
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [displayRows, setDisplayRows] = useState(rows);
  const [syncMeta, setSyncMeta] = useState<SyncMeta>({ lastSyncAt: null, linesLastSync: 0 });
  const [syncDetailsOpen, setSyncDetailsOpen] = useState(false);
  const [lastSyncDetails, setLastSyncDetails] = useState<
    Array<{
      joueur_id?: string;
      nom: string;
      categorie: string | null;
      categorie_age?: string | null;
      status: string;
      message?: string;
    }>
  >([]);
  const [lastSyncStats, setLastSyncStats] = useState<{
    par_categorie?: Record<string, { traites: number; synchronises: number; introuvables: number }>;
    en_attente_quota?: number;
  } | null>(null);

  useEffect(() => {
    setDisplayRows(rows);
  }, [rows]);

  const filtered = useMemo(() => {
    const list =
      categorie === "all" ? displayRows : displayRows.filter((r) => r.categorie === categorie);    return [...list].sort((a, b) => a.rang - b.rang);
  }, [displayRows, categorie]);

  const lastMaj = useMemo(() => {
    if (!displayRows.length) return null;
    const dates = displayRows.map((r) => r.date_maj).filter(Boolean).sort();    return dates[dates.length - 1] ?? null;
  }, [displayRows]);

  const refreshRows = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/classements-externes", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { rows?: ClassementExterneRow[]; syncMeta?: SyncMeta };
      setDisplayRows(json.rows ?? []);
      if (json.syncMeta) setSyncMeta(json.syncMeta);
    } catch {
      /* ignore */
    }
  }, []);

  const handleSync = useCallback(
    async (mode: "cache" | "rankings" | "api" = "cache") => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/dashboard/classements-externes/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = (await res.json()) as {
        error?: string;
        hint?: string;
        mode?: string;
        synchronises?: number;
        traites?: number;
        introuvables?: number;
        erreurs?: number;
        en_attente_quota?: number;
        api_calls_used?: number;
        messages?: string[];
        par_categorie?: Record<
          string,
          { traites: number; synchronises: number; introuvables: number; ignores: number; erreurs: number }
        >;
        details?: Array<{
          nom: string;
          categorie: string | null;
          status: string;
          message?: string;
        }>;
        syncMeta?: SyncMeta;
      };
      const n = json.synchronises ?? 0;
      const calls =
        json.api_calls_used != null
          ? json.api_calls_used === 0
            ? " (0 appel API)"
            : ` (${json.api_calls_used} appel(s) API)`
          : "";
      const extra = json.messages?.filter(Boolean).join(" · ");
      const stats =
        n === 0
          ? `${json.introuvables ?? 0} non trouvé(s), ${json.erreurs ?? 0} erreur(s)`
          : `${n} mis à jour`;

      if (!res.ok && n === 0 && json.error) {
        setSyncMessage(
          [json.error, json.hint, extra, stats].filter(Boolean).join(" — ") || "Synchronisation échouée"
        );
      } else if (n === 0) {
        setSyncMessage(
          [extra, `${stats}${calls}.`].filter(Boolean).join(" · ")
        );
      } else {
        setSyncMessage(
          extra
            ? `Sync : ${stats}${calls} — ${extra}`
            : `Synchronisation OK — ${n} classement(s) mis à jour sur ${json.traites ?? "?"} joueur(s)${calls}.`
        );
      }
      await refreshRows();
      if (json.syncMeta) setSyncMeta(json.syncMeta);
      if (json.details?.length) setLastSyncDetails(json.details);
      if (json.par_categorie) {
        setLastSyncStats({
          par_categorie: json.par_categorie,
          en_attente_quota: json.en_attente_quota,
        });
      }
      if (n > 0) onSynced?.();
    } catch {
      setSyncMessage("Erreur réseau lors de la synchronisation.");
    } finally {
      setSyncing(false);
    }
  },
    [onSynced, refreshRows]
  );
  return (
    <div className="v2-kpi-card overflow-hidden p-0">
      <div className="border-b border-[var(--border-main)] bg-gradient-to-r from-[var(--frmt-navy,#0f172a)]/10 to-[var(--frmt-green,#16a34a)]/10 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="dashboard-section-label">Classements ATP / WTA / ITF</h2>
            {lastMaj && (
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                Dernière mise à jour : {fmtDate(lastMaj)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-0.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategorie(c.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-medium transition",
                    categorie === c.value
                      ? "bg-[var(--frmt-green,#16a34a)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleSync("cache")}
              disabled={syncing}
              title="Relance la mise en base depuis le cache local (0 appel RapidAPI)"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--frmt-green,#16a34a)]/50 bg-[var(--bg-card)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--frmt-green,#16a34a)] hover:bg-[var(--frmt-green,#16a34a)]/10 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
              {syncing ? "Sync…" : "Synchroniser"}
            </button>
            <button
              type="button"
              onClick={() => void handleSync("rankings")}
              disabled={syncing}
              title="Met à jour le top 500 ATP/WTA en cache (2 appels API / jour)"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-2 py-1.5 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              Màj ATP/WTA
            </button>
            <button
              type="button"
              onClick={() => void handleSync("api")}
              disabled={syncing}
              title="Recherche les joueurs hors top 500 (consomme le quota journalier)"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-2 py-1.5 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              Recherche API
            </button>
          </div>
        </div>
        {syncMessage && (
          <p className="mt-2 text-[11px] text-[var(--text-secondary)]">{syncMessage}</p>
        )}
        {syncMeta.lastSyncAt && (
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            Dernière synchronisation mémorisée : {fmtDate(syncMeta.lastSyncAt)} —{" "}
            {syncMeta.linesLastSync} ligne(s) traitée(s)
          </p>
        )}
        {lastSyncStats?.par_categorie && (
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">
            ATP {lastSyncStats.par_categorie.ATP?.synchronises ?? 0}/
            {lastSyncStats.par_categorie.ATP?.traites ?? 0} · WTA{" "}
            {lastSyncStats.par_categorie.WTA?.synchronises ?? 0}/
            {lastSyncStats.par_categorie.WTA?.traites ?? 0} · ITF{" "}
            {lastSyncStats.par_categorie["ITF Junior"]?.synchronises ?? 0}/
            {lastSyncStats.par_categorie["ITF Junior"]?.traites ?? 0}
            {(lastSyncStats.en_attente_quota ?? 0) > 0 &&
              ` · ${lastSyncStats.en_attente_quota} en attente quota`}
          </p>
        )}
        {lastSyncDetails.some((d) => d.status === "not_found" || d.status === "error") && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setSyncDetailsOpen((v) => !v)}
              className="text-[10px] font-medium text-[var(--frmt-green,#16a34a)] hover:underline"
            >
              {syncDetailsOpen ? "Masquer" : "Voir"} les joueurs non synchronisés (
              {lastSyncDetails.filter((d) => d.status === "not_found" || d.status === "error").length})
            </button>
            {syncDetailsOpen && (
              <ul className="mt-1.5 max-h-40 space-y-0.5 overflow-y-auto text-[10px] text-[var(--text-muted)]">
                {lastSyncDetails
                  .filter((d) => d.status === "not_found" || d.status === "error")
                  .map((d) => (
                    <li key={d.joueur_id ?? `${d.nom}-${d.categorie}`}>
                      <strong>{d.nom}</strong>
                      {d.categorie ? ` (${d.categorie})` : d.categorie_age ? ` (${d.categorie_age})` : ""} —{" "}
                      {d.message ?? d.status}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-[12px] text-[var(--text-muted)]">
            Aucun classement externe en base.
          </p>
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            <strong>Synchroniser</strong> = cache local (0 appel).{" "}
            <strong>Màj ATP/WTA</strong> = top 500 dont rangs 462+ (2 appels / jour).{" "}
            <strong>Recherche API</strong> = joueurs &gt;#500 (quota 50/j).
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-[var(--border-main)] bg-[var(--bg-inset)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-2.5 font-medium">Joueur</th>
                <th className="px-3 py-2.5 font-medium">Catégorie</th>
                <th className="px-3 py-2.5 font-medium text-right">Rang</th>
                <th className="px-3 py-2.5 font-medium text-right">Points</th>
                <th className="px-3 py-2.5 font-medium text-right">Évolution</th>
                <th className="px-4 py-2.5 font-medium">Mise à jour</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const evo = fmtEvolution(row.evolution);
                return (
                <tr
                  key={row.id}
                  className="border-b border-[var(--border-main)]/60 transition hover:bg-[var(--bg-hover)]"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/v2/joueurs/${row.joueur_id}`}
                      className="font-medium text-[var(--text-primary)] hover:text-[var(--frmt-green,#16a34a)]"
                    >
                      {row.nom_joueur}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        BADGE_CLASS[row.categorie] ?? "bg-[var(--bg-inset)] text-[var(--text-primary)]"
                      )}
                    >
                      {row.categorie}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                    #{row.rang}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                    {row.points != null ? row.points.toLocaleString("fr-FR") : "—"}
                  </td>
                  <td className={cn("px-3 py-2 text-right tabular-nums text-[11px] font-medium", evo.className)}>
                    {evo.text}
                  </td>
                  <td className="px-4 py-2 text-[11px] text-[var(--text-muted)]">
                    {fmtDate(row.date_maj)}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

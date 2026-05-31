"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Trophy, User, Users, Flag } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useDebounced } from "@/lib/hooks/useDebounced";
import {
  globalSearchTypeLabel,
  pickBestSearchResult,
  runGlobalSearch,
  type GlobalSearchResult,
  type GlobalSearchResultType,
} from "@/lib/v2/global-search";

const TYPE_ICON: Record<GlobalSearchResultType, LucideIcon> = {
  joueur: User,
  entraineur: Users,
  stage: Flag,
  competition: Trophy,
};

export function GlobalSearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const debounced = useDebounced(q, 280);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (term: string) => {
    const t = term.trim();
    if (t.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const found = await runGlobalSearch(t, 10);
    setResults(found);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    void search(debounced);
  }, [debounced, open, search]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function goTo(result: GlobalSearchResult) {
    setOpen(false);
    setQ("");
    router.push(result.href);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    const found = await runGlobalSearch(term, 12);
    setLoading(false);
    const best = pickBestSearchResult(found);
    if (best) {
      goTo(best);
      return;
    }
    router.push(`/v2/joueurs?q=${encodeURIComponent(term)}`);
  }

  return (
    <div ref={wrapRef} className={cn("relative w-full min-w-[220px]", className)}>
      <form onSubmit={(e) => void onSubmit(e)} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b949e]" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher joueur, coach, stage, compétition…"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-2.5 pl-10 pr-10 text-sm text-[#e6edf3] outline-none transition placeholder:text-[#6e7681] focus:border-frmt-gold focus:ring-1 focus:ring-frmt-gold/30"
          autoComplete="off"
          aria-label="Recherche globale"
          aria-expanded={open}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-frmt-gold" />
        )}
      </form>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-[#30363d] bg-[#161b22] py-1 shadow-2xl shadow-black/40">
          {loading && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[#8b949e]">Recherche en cours…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[#8b949e]">Aucun résultat pour « {q.trim()} »</p>
          ) : (
            <ul>
              {results.map((r) => {
                const Icon = TYPE_ICON[r.type];
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-[#21262d]"
                      onClick={() => goTo(r)}
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#30363d] bg-[#0d1117]">
                        <Icon className="h-4 w-4 text-frmt-gold" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[#e6edf3]">{r.label}</span>
                          <span className="rounded-full bg-[#21262d] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8b949e]">
                            {globalSearchTypeLabel(r.type)}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[#6e7681]">{r.subtitle}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-[#30363d] px-3 py-2 text-[10px] text-[#6e7681]">
            Entrée : meilleur résultat · accents ignorés
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import type { ProgrammationPdfTypeLetter } from "@/lib/types/programmation-joueurs";
import { cn } from "@/lib/utils/cn";

const TYPE_META: Record<
  ProgrammationPdfTypeLetter,
  { title: string; desc: string; accent: string }
> = {
  A: {
    title: "Planning mensuel",
    desc: "Vue semaines · 1 à N joueurs · A4 paysage",
    accent: "border-blue-500/50 bg-blue-500/10",
  },
  B: {
    title: "Planning trimestriel",
    desc: "3 blocs mensuels + récap trimestre",
    accent: "border-emerald-500/50 bg-emerald-500/10",
  },
  C: {
    title: "Planning annuel",
    desc: "12 mois + synthèse annuelle",
    accent: "border-amber-500/50 bg-amber-500/10",
  },
  D: {
    title: "Fiche individuelle",
    desc: "1 joueur · portrait · stats + chronologie",
    accent: "border-violet-500/50 bg-violet-500/10",
  },
  E: {
    title: "Rapport comparatif",
    desc: "Page de garde + fiches + tableau équipe",
    accent: "border-rose-500/50 bg-rose-500/10",
  },
};

type Props = {
  type: ProgrammationPdfTypeLetter;
  selected: boolean;
  disabled?: boolean;
  onSelect: (type: ProgrammationPdfTypeLetter) => void;
};

export function ExportTypeCard({ type, selected, disabled, onSelect }: Props) {
  const meta = TYPE_META[type];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(type)}
      className={cn(
        "group relative rounded-lg border p-3 text-left transition",
        "hover:border-[var(--accent)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40",
        selected ? "border-[var(--accent)] ring-1 ring-[var(--accent)]/50" : "border-[var(--border)]",
        disabled && "cursor-not-allowed opacity-50",
        meta.accent
      )}
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-[#0A1628] text-xs font-bold text-white">
        {type}
      </span>
      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{meta.title}</p>
      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{meta.desc}</p>
      <PreviewMiniature type={type} />
    </button>
  );
}

function PreviewMiniature({ type }: { type: ProgrammationPdfTypeLetter }) {
  return (
    <div
      className="pointer-events-none mt-3 hidden rounded border border-[var(--border)] bg-white p-1 opacity-0 shadow-lg transition group-hover:block group-hover:opacity-100 lg:absolute lg:left-full lg:top-0 lg:z-10 lg:ml-2 lg:mt-0 lg:block lg:w-36"
      aria-hidden
    >
      <div className="h-1 rounded-sm bg-[#0A1628]" />
      <div className="mt-0.5 flex gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-2 flex-1 rounded-sm bg-slate-200" />
        ))}
      </div>
      <div className="mt-1 space-y-0.5">
        {type === "D" ? (
          <>
            <div className="h-6 rounded bg-slate-100" />
            <div className="h-3 rounded bg-slate-50" />
          </>
        ) : type === "C" ? (
          <div className="grid grid-cols-6 gap-px">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-2 rounded-sm bg-slate-200" />
            ))}
          </div>
        ) : (
          <>
            <div className="h-2 rounded bg-slate-100" />
            <div className="h-2 rounded bg-slate-50" />
            <div className="h-2 rounded bg-slate-100" />
          </>
        )}
      </div>
    </div>
  );
}

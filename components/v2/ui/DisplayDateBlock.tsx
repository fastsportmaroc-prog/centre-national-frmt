"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatDateHeaderParts, formatDateLong, MOROCCO_TIMEZONE } from "@/lib/v2/format-display-date";

type Variant = "topbar" | "banner";

type HeaderParts = ReturnType<typeof formatDateHeaderParts>;

const PLACEHOLDER_PARTS: HeaderParts = {
  weekday: "···",
  day: "·",
  month: "···",
  year: "····",
  time: "--:--",
  tzLabel: "GMT+1",
  iso: "0000-00-00",
};

export function DisplayDateBlock({
  variant = "topbar",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const [parts, setParts] = useState<HeaderParts | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setParts(formatDateHeaderParts(now));
      setTitle(formatDateLong(now));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const display = parts ?? PLACEHOLDER_PARTS;

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "w-full rounded-2xl border border-frmt-gold/25 bg-gradient-to-br from-[#0d1117] via-[#161b22] to-[#0d1117] px-6 py-5 shadow-lg shadow-black/30",
          className
        )}
        title={title || undefined}
        aria-busy={!parts}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:gap-8">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 border-frmt-gold/40 bg-frmt-gold/10 sm:h-24 sm:w-24">
              <span className="text-xs font-bold uppercase tracking-widest text-frmt-gold">
                {display.weekday.slice(0, 3)}
              </span>
              <span className="text-4xl font-bold leading-none text-white sm:text-5xl">{display.day}</span>
            </div>
            <div className="text-left">
              <p className="text-xl font-bold capitalize text-[#e6edf3] sm:text-2xl">{display.month}</p>
              <p className="text-lg text-[#8b949e]">{display.year}</p>
              <p className="mt-1 text-sm capitalize text-[#6e7681]">{display.weekday}</p>
            </div>
          </div>
          <div className="h-px w-full bg-[#30363d] sm:h-20 sm:w-px" />
          <div>
            <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-frmt-gold sm:justify-start">
              <MapPin className="h-3.5 w-3.5" />
              Heure du Maroc
            </p>
            <p className="mt-1 font-mono text-5xl font-bold tabular-nums tracking-tight text-frmt-gold sm:text-6xl">
              {display.time}
            </p>
            <p className="mt-1 text-xs text-[#6e7681]">{display.tzLabel}</p>
          </div>
        </div>
      </div>
    );
  }

  /* topbar — centré, lisible, taille modérée */
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-frmt-gold/20 bg-gradient-to-r from-[#0d1117]/90 via-[#161b22] to-[#0d1117]/90 px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2 lg:max-w-xl",
        className
      )}
      title={title ? `${title} — ${MOROCCO_TIMEZONE}` : undefined}
      aria-busy={!parts}
    >
      <Calendar className="hidden h-4 w-4 shrink-0 text-frmt-gold md:block" aria-hidden />

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:gap-3">
        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-frmt-gold/35 bg-frmt-gold/10 sm:h-11 sm:w-11">
          <span className="text-[9px] font-bold uppercase tracking-wide text-frmt-gold">
            {display.weekday.slice(0, 3)}
          </span>
          <span className="text-lg font-bold leading-none text-white sm:text-xl">{display.day}</span>
        </div>

        <div className="min-w-0 text-center sm:text-left">
          <p className="truncate text-sm font-semibold capitalize text-[#e6edf3] sm:text-base">
            {display.month} {display.year}
          </p>
          <p className="truncate text-[11px] capitalize text-[#8b949e]">{display.weekday}</p>
        </div>

        <span className="hidden h-9 w-px shrink-0 bg-[#30363d] sm:block" aria-hidden />

        <div className="shrink-0 text-center sm:text-right">
          <p className="flex items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-frmt-gold sm:justify-end">
            <Clock className="h-3 w-3 text-frmt-gold" aria-hidden />
            Maroc
          </p>
          <p className="font-mono text-xl font-bold tabular-nums leading-none text-frmt-gold sm:text-2xl">
            {display.time}
          </p>
        </div>
      </div>
    </div>
  );
}

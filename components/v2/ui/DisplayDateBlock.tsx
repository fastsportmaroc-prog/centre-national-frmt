"use client";

import { useEffect, useState } from "react";
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
          "w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-6 py-5",
          className
        )}
        title={title || undefined}
        aria-busy={!parts}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:gap-8">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-inset)] sm:h-24 sm:w-24">
              <span className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
                {display.weekday.slice(0, 3)}
              </span>
              <span className="text-4xl font-bold leading-none text-[var(--text-primary)] sm:text-5xl">
                {display.day}
              </span>
            </div>
            <div className="text-left">
              <p className="text-xl font-bold capitalize text-[var(--text-primary)] sm:text-2xl">
                {display.month}
              </p>
              <p className="text-lg text-[var(--text-secondary)]">{display.year}</p>
              <p className="mt-1 text-sm capitalize text-[var(--text-muted)]">{display.weekday}</p>
            </div>
          </div>
          <div className="h-px w-full bg-[var(--border-main)] sm:h-20 sm:w-px" />
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
              Heure du Maroc
            </p>
            <p className="v2-topbar-datetime-time mt-1 text-5xl font-bold sm:text-6xl">
              {display.time}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{display.tzLabel}</p>
          </div>
        </div>
      </div>
    );
  }

  const dateLine = `${display.weekday.slice(0, 3)} ${display.day} ${display.month.slice(0, 3)} ${display.year}`;

  return (
    <div
      className={cn("v2-topbar-datetime gap-0 px-3", className)}
      title={title ? `${title} — ${MOROCCO_TIMEZONE}` : undefined}
      aria-busy={!parts}
    >
      <span className="truncate px-2 capitalize">{dateLine}</span>
      <span className="v2-topbar-datetime-divider" aria-hidden />
      <span className="v2-topbar-datetime-time px-2">{display.time}</span>
    </div>
  );
}

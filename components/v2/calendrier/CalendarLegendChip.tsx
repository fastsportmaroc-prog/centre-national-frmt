import type { CalendarColorStyle } from "@/lib/v2/calendar-colors";

export type CalendarLegendItem = CalendarColorStyle & { label: string };

/** Pastille légende — couleurs en inline + carré coloré (lisible sur fond noir). */
export function CalendarLegendChip({ label, bg, border, text }: CalendarLegendItem) {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-semibold leading-none shadow-sm"
      style={{
        backgroundColor: bg,
        border: `2px solid ${border}`,
        color: text,
      }}
    >
      <span
        aria-hidden
        className="inline-block size-3.5 shrink-0 rounded-sm"
        style={{
          backgroundColor: border,
          boxShadow: "0 0 0 1px rgba(255,255,255,0.25)",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

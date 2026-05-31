import type { ReactNode } from "react";

export function RapportSectionShell({
  title,
  children,
  accent = "green",
}: {
  title: string;
  children: ReactNode;
  accent?: "green" | "red";
}) {
  const border = accent === "red" ? "border-l-frmt-red" : "border-l-frmt-green";
  return (
    <section
      className={`rounded-lg border border-[#2a2d3a] bg-[#1a1d27] p-4 ${border} border-l-4`}
    >
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-frmt-green">{title}</h2>
      {children}
    </section>
  );
}

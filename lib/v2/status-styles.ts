export type StatutVisuel = "prevu" | "confirme" | "en_cours" | "termine" | "annule" | "demande" | "rembourse" | string;

export function statutBadgeClass(statut: StatutVisuel): string {
  const s = (statut ?? "prevu").toLowerCase();
  if (s.includes("confirm")) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  if (s.includes("cours")) return "bg-blue-500/20 text-blue-400 border-blue-500/40";
  if (s.includes("termin")) return "bg-teal-500/20 text-teal-400 border-teal-500/40";
  if (s.includes("annul") || s.includes("refus")) return "bg-red-500/20 text-red-400 border-red-500/40";
  if (s.includes("rembours")) return "bg-orange-500/20 text-orange-400 border-orange-500/40";
  if (s.includes("demande") || s.includes("attente") || s.includes("prevu"))
    return "bg-zinc-500/20 text-zinc-400 border-zinc-500/40";
  return "bg-zinc-500/20 text-zinc-400 border-zinc-500/40";
}

export function calcAge(dateNaissance: string | undefined): number | null {
  if (!dateNaissance) return null;
  const d = new Date(dateNaissance);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

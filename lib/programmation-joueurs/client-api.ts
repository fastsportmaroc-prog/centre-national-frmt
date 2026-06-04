import type {
  CreateProgrammationPayload,
  ProgrammationEvenement,
  ProgrammationEvenementEnriched,
  ProgrammationEvenementInput,
  ProgrammationFilters,
  ProgrammationJoueurStats,
  ProgrammationPdfType,
} from "@/lib/types/programmation-joueurs";

function filtersToParams(f?: ProgrammationFilters): string {
  if (!f) return "";
  const sp = new URLSearchParams();
  if (f.joueurId) sp.set("joueurId", f.joueurId);
  f.joueurIds?.forEach((id) => sp.append("joueurIds", id));
  if (f.type) sp.set("type", Array.isArray(f.type) ? f.type[0]! : f.type);
  if (f.statut) sp.set("statut", f.statut);
  if (f.surface) sp.set("surface", f.surface);
  if (f.dateDebut) sp.set("dateDebut", f.dateDebut);
  if (f.dateFin) sp.set("dateFin", f.dateFin);
  if (f.search) sp.set("search", f.search);
  if (f.categorieJoueur) sp.set("categorieJoueur", f.categorieJoueur);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchProgrammationEvenements(
  filters?: ProgrammationFilters
): Promise<{
  evenements: ProgrammationEvenementEnriched[];
  error?: string;
  migrationRequired?: boolean;
}> {
  const res = await fetch(`/api/programmation-joueurs${filtersToParams(filters)}`, {
    cache: "no-store",
  });
  const json = (await res.json()) as {
    evenements?: ProgrammationEvenementEnriched[];
    error?: string;
    migrationRequired?: boolean;
  };
  if (!res.ok) return { evenements: [], error: json.error ?? "Erreur chargement" };
  return {
    evenements: json.evenements ?? [],
    error: json.error,
    migrationRequired: json.migrationRequired,
  };
}

export async function fetchProgrammationEvenement(
  id: string
): Promise<{ evenement: ProgrammationEvenementEnriched | null; error?: string }> {
  const res = await fetch(`/api/programmation-joueurs/${id}`, { cache: "no-store" });
  const json = (await res.json()) as { evenement?: ProgrammationEvenementEnriched | null; error?: string };
  if (!res.ok) return { evenement: null, error: json.error ?? "Erreur chargement" };
  return { evenement: json.evenement ?? null };
}

export async function createProgrammationEvenements(
  payload: CreateProgrammationPayload
): Promise<{ evenements: ProgrammationEvenement[]; error?: string }> {
  const res = await fetch("/api/programmation-joueurs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as { evenements?: ProgrammationEvenement[]; error?: string };
  if (!res.ok) return { evenements: [], error: json.error ?? "Erreur création" };
  return { evenements: json.evenements ?? [] };
}

export async function updateProgrammationEvenement(
  id: string,
  patch: Partial<ProgrammationEvenementInput>
): Promise<{ evenement: ProgrammationEvenement | null; error?: string }> {
  const res = await fetch(`/api/programmation-joueurs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = (await res.json()) as { evenement?: ProgrammationEvenement | null; error?: string };
  if (!res.ok) return { evenement: null, error: json.error ?? "Erreur mise à jour" };
  return { evenement: json.evenement ?? null };
}

export async function deleteProgrammationEvenement(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/programmation-joueurs/${id}`, { method: "DELETE" });
  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) return { ok: false, error: json.error ?? "Erreur suppression" };
  return { ok: json.ok ?? true };
}

export async function fetchProgrammationStats(
  joueurId: string,
  annee?: number
): Promise<{ stats: ProgrammationJoueurStats | null; error?: string }> {
  const qs = annee ? `?annee=${annee}` : "";
  const res = await fetch(`/api/programmation-joueurs/stats/${joueurId}${qs}`, { cache: "no-store" });
  const json = (await res.json()) as { stats?: ProgrammationJoueurStats; error?: string };
  if (!res.ok) return { stats: null, error: json.error ?? "Erreur stats" };
  return { stats: json.stats ?? null };
}

export type ProgrammationPdfExportOptions = {
  joueurIds: string[];
  dateDebut: string;
  dateFin: string;
  typePdf: ProgrammationPdfType;
  includeResultats?: boolean;
  includePoints?: boolean;
  includeClassement?: boolean;
};

export async function exportProgrammationPdf(options: ProgrammationPdfExportOptions): Promise<void> {
  const sp = new URLSearchParams();
  options.joueurIds.forEach((id) => sp.append("joueurIds", id));
  sp.set("dateDebut", options.dateDebut);
  sp.set("dateFin", options.dateFin);
  sp.set("typePdf", options.typePdf);
  if (options.includeResultats) sp.set("includeResultats", "1");
  if (options.includePoints) sp.set("includePoints", "1");
  if (options.includeClassement) sp.set("includeClassement", "1");

  const res = await fetch(`/api/programmation-joueurs/export/pdf?${sp.toString()}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Erreur export PDF");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `programme-${options.typePdf}-${options.dateDebut}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

import type {
  RapportStatut,
  RapportType,
  ReportSectionsConfig,
  RapportPeriode,
} from "@/lib/rapports/types";
import { DEFAULT_SECTIONS_CONFIG } from "@/lib/rapports/types";
import {
  MOCK_COMPETITION_ID,
  MOCK_STAGE_U18_ID,
} from "@/lib/rapports/mock-data";

export type StoredReportV2 = {
  id: string;
  titre: string;
  type: RapportType;
  entity_id?: string;
  /** @deprecated use entity_id */
  stage_id?: string;
  stage_nom?: string;
  competition_nom?: string;
  periode?: RapportPeriode;
  statut: RapportStatut;
  sections: ReportSectionsConfig;
  observations?: string;
  recommandations?: string;
  generated_at: string;
  generated_by: string;
};

const KEY = "frmt-reports-v2";
const SEED_KEY = "frmt-reports-v2-seeded";

function normalizeReport(raw: Record<string, unknown>): StoredReportV2 {
  let type = (raw.type as string) ?? "bilan_stage";
  if (type === "bilan_competition") type = "competition";
  const entity_id = (raw.entity_id as string) ?? (raw.stage_id as string);
  const legacyPeriode =
    raw.periode ??
    (raw.periode_debut && raw.periode_fin
      ? { debut: String(raw.periode_debut), fin: String(raw.periode_fin) }
      : undefined);
  return {
    id: String(raw.id),
    titre: String(raw.titre),
    type: type as RapportType,
    entity_id,
    stage_id: entity_id,
    stage_nom: raw.stage_nom as string | undefined,
    competition_nom: raw.competition_nom as string | undefined,
    periode: legacyPeriode as RapportPeriode | undefined,
    statut: (raw.statut as RapportStatut) ?? "genere",
    sections: { ...DEFAULT_SECTIONS_CONFIG, ...(raw.sections as Partial<ReportSectionsConfig>) },
    observations: raw.observations as string | undefined,
    recommandations: raw.recommandations as string | undefined,
    generated_at: String(raw.generated_at),
    generated_by: String(raw.generated_by ?? "s.abderrazzaq@frmt.ma"),
  };
}

function seedMockReportIfNeeded(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SEED_KEY)) return;

  const mock: StoredReportV2 = {
    id: "rapport-mock-u18-mai-2026",
    titre: "Bilan — Stage National U18 — Mai 2026",
    type: "bilan_stage",
    entity_id: MOCK_STAGE_U18_ID,
    stage_id: MOCK_STAGE_U18_ID,
    stage_nom: "Stage National U18 — Mai 2026",
    periode: { debut: "2026-05-04", fin: "2026-05-17", label: "Mai 2026" },
    statut: "genere",
    sections: DEFAULT_SECTIONS_CONFIG,
    observations: "Stage conforme au programme fédéral U18.",
    recommandations: "Renforcer le suivi kinésithérapie pour les stages > 10 jours.",
    generated_at: "2026-05-18T10:00:00.000Z",
    generated_by: "s.abderrazzaq@frmt.ma",
  };

  const mockComp: StoredReportV2 = {
    id: "rapport-mock-comp-casa-2026",
    titre: "Rapport — Open de Casablanca U18",
    type: "competition",
    entity_id: MOCK_COMPETITION_ID,
    competition_nom: "Open de Casablanca U18 — Juin 2026",
    periode: { debut: "2026-06-10", fin: "2026-06-15", label: "Juin 2026" },
    statut: "brouillon",
    sections: DEFAULT_SECTIONS_CONFIG,
    generated_at: new Date().toISOString(),
    generated_by: "s.abderrazzaq@frmt.ma",
  };

  const existing = listReportsLocalRaw();
  const merged = [mock, mockComp, ...existing.filter((r) => r.id !== mock.id && r.id !== mockComp.id)];
  localStorage.setItem(KEY, JSON.stringify(merged.slice(0, 50)));
  localStorage.setItem(SEED_KEY, "1");
}

function listReportsLocalRaw(): StoredReportV2[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    return parsed.map(normalizeReport);
  } catch {
    return [];
  }
}

export function listReportsLocal(): StoredReportV2[] {
  seedMockReportIfNeeded();
  return listReportsLocalRaw();
}

export function getReportLocal(id: string): StoredReportV2 | null {
  seedMockReportIfNeeded();
  return listReportsLocalRaw().find((r) => r.id === id) ?? null;
}

export function saveReportLocal(report: StoredReportV2): void {
  const list = listReportsLocalRaw().filter((r) => r.id !== report.id);
  list.unshift(normalizeReport(report as unknown as Record<string, unknown>));
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
}

export function updateReportLocal(id: string, patch: Partial<StoredReportV2>): StoredReportV2 | null {
  const list = listReportsLocalRaw();
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  list[idx] = normalizeReport({ ...list[idx], ...patch } as unknown as Record<string, unknown>);
  localStorage.setItem(KEY, JSON.stringify(list));
  return list[idx];
}

export function deleteReportLocal(id: string): void {
  const list = listReportsLocalRaw().filter((r) => r.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function formatPeriodeLabel(periode?: RapportPeriode): string {
  if (!periode) return "—";
  if (periode.label) return periode.label;
  const d = (s: string) => new Date(s).toLocaleDateString("fr-FR");
  return `${d(periode.debut)} → ${d(periode.fin)}`;
}

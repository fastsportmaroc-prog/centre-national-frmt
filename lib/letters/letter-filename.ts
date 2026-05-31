import type { LettreBuiltContent } from "@/lib/letters/letter-types";

export function slugifyStageFilename(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);
}

export function buildLettrePdfFilename(stageAction: string, dateDebut: string): string {
  const slug = slugifyStageFilename(stageAction);
  const date = dateDebut.slice(0, 10);
  return `Lettre_officielle_stage_${slug}_${date}.pdf`;
}

export function buildLettreDocxFilename(stageAction: string, dateDebut: string): string {
  return buildLettrePdfFilename(stageAction, dateDebut).replace(/\.pdf$/, ".docx");
}

export function buildLettreFilenameBase(stageAction: string, dateDebut: string): string {
  return `Lettre_officielle_stage_${slugifyStageFilename(stageAction)}_${dateDebut.slice(0, 10)}`;
}

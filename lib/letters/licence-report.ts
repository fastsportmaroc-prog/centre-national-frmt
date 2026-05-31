import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";

export type LicencePersonRef = {
  id: string;
  type: "joueur" | "entraineur";
  nom: string;
  prenom: string;
};

export type LicenceReport = {
  missing: LicencePersonRef[];
  complete: boolean;
  lines: { person: LicencePersonRef; licence: string | null }[];
};

function licenceJoueur(j: JoueurV2): string | null {
  const v = (j.licence ?? "").trim();
  return v || null;
}

function licenceCoach(e: { licence_fft?: string | null; licence?: string | null }): string | null {
  const v = (e.licence_fft ?? e.licence ?? "").trim();
  return v || null;
}

type CoachLicenceFields = { licence_fft?: string | null; licence?: string | null };

export function buildLicenceReport(
  joueurs: Pick<JoueurV2, "id" | "nom" | "prenom" | "licence">[],
  coachs: (Pick<EntraineurV2, "id" | "nom" | "prenom"> & CoachLicenceFields)[]
): LicenceReport {
  const lines: LicenceReport["lines"] = [];
  const missing: LicencePersonRef[] = [];

  for (const j of joueurs) {
    const lic = licenceJoueur(j);
    const person: LicencePersonRef = {
      id: j.id,
      type: "joueur",
      nom: j.nom,
      prenom: j.prenom,
    };
    lines.push({ person, licence: lic });
    if (!lic) missing.push(person);
  }

  for (const e of coachs) {
    const lic = licenceCoach(e);
    const person: LicencePersonRef = {
      id: e.id,
      type: "entraineur",
      nom: e.nom,
      prenom: e.prenom,
    };
    lines.push({ person, licence: lic });
    if (!lic) missing.push(person);
  }

  return { missing, complete: missing.length === 0, lines };
}

export function formatLicenceRecapText(report: LicenceReport, stageNom: string): string {
  const header = `Récapitulatif licences — ${stageNom}\n${"=".repeat(40)}\n\n`;
  const body = report.lines
    .map((l) => {
      const role = l.person.type === "joueur" ? "Joueur" : "Entraîneur";
      const lic = l.licence ?? "MANQUANTE";
      return `${role}: ${l.person.prenom} ${l.person.nom} — Licence: ${lic}`;
    })
    .join("\n");
  const footer = report.missing.length
    ? `\n\n⚠ Licences manquantes (${report.missing.length}):\n${report.missing
        .map((m) => `- ${m.prenom} ${m.nom}`)
        .join("\n")}`
    : "\n\n✓ Toutes les licences sont renseignées.";
  return header + body + footer;
}

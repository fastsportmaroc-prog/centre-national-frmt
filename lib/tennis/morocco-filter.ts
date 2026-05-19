/** Filtre obligatoire — uniquement joueurs marocains en profil FRMT */

export const MOROCCO_COUNTRY_CODE = "MAR";
export const MOROCCO_NATIONALITY = "Maroc";
export const MOROCCO_FLAG = "Morocco";
export const MOROCCO_FEDERATION = "FRMT";

export type PlayerNationalityInput = {
  nationalite?: string | null;
  country_code?: string | null;
  flag?: string | null;
  federation?: string | null;
  is_marocain?: boolean | null;
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function isMoroccanPlayer(input: PlayerNationalityInput): boolean {
  if (input.is_marocain === true) return true;
  const code = norm(input.country_code);
  const nat = norm(input.nationalite);
  const flag = norm(input.flag);
  const fed = norm(input.federation);
  return (
    code === "mar" ||
    code === "ma" ||
    nat === "maroc" ||
    nat === "morocco" ||
    nat === "marocaine" ||
    nat === "marocain" ||
    flag === "morocco" ||
    flag === "maroc" ||
    fed === "frmt" ||
    fed.includes("fédération royale marocaine")
  );
}

/**
 * Avant toute sauvegarde ou affichage en tant que fiche joueur FRMT.
 * Les adversaires étrangers ne passent jamais par ce filtre pour création de profil.
 */
export function canImportAsPlayerProfile(input: PlayerNationalityInput): boolean {
  return isMoroccanPlayer(input);
}

export function assertMoroccanPlayerProfile(input: PlayerNationalityInput): void {
  if (!canImportAsPlayerProfile(input)) {
    throw new Error(
      "Import refusé : seuls les joueurs marocains (MAR / Maroc / FRMT) peuvent avoir une fiche joueur."
    );
  }
}

export function normalizeMoroccanPlayer<T extends PlayerNationalityInput>(input: T): T {
  assertMoroccanPlayerProfile(input);
  return {
    ...input,
    nationalite: MOROCCO_NATIONALITY,
    country_code: MOROCCO_COUNTRY_CODE,
    federation: MOROCCO_FEDERATION,
    is_marocain: true,
    is_frmt_tracked: true,
  };
}

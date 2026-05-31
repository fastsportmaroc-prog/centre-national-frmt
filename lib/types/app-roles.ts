/** Rôles applicatifs Centre National (colonne profiles.role) */

export type AppRole = "admin" | "entraineur" | "coach" | "viewer" | "direction" | "joueur";

export const APP_ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Administrateur" },
  { value: "entraineur", label: "Entraîneur" },
  { value: "coach", label: "Coach" },
  { value: "joueur", label: "Joueur" },
  { value: "viewer", label: "Lecture seule (legacy)" },
  { value: "direction", label: "Direction" },
];

export function normalizeAppRole(raw: string | null | undefined): AppRole {
  const r = (raw ?? "").toLowerCase();
  if (r === "admin") return "admin";
  if (r === "entraineur") return "entraineur";
  if (r === "coach") return "coach";
  if (r === "direction" || r === "directeur") return "direction";
  if (r === "joueur") return "joueur";
  if (r === "viewer" || r === "staff" || r === "logisticien") return "viewer";
  return "viewer";
}

export function roleLabel(role: AppRole): string {
  return APP_ROLES.find((x) => x.value === role)?.label ?? role;
}

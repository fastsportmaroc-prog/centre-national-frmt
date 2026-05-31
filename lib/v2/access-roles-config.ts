import type { AppRole } from "@/lib/types/app-roles";

/** Rôles gérés depuis Paramètres → Accès */
export const PARAMETRES_ACCESS_ROLES: { value: AppRole; label: string; description: string }[] = [
  {
    value: "admin",
    label: "Administrateur",
    description: "Accès complet : paramètres, budget, utilisateurs, suppression, toutes les rubriques V2.",
  },
  {
    value: "coach",
    label: "Coach",
    description: "Tableau de bord, planning, calendrier, réservations — sans budget ni paramètres.",
  },
  {
    value: "joueur",
    label: "Joueur",
    description: "Consultation limitée : tableau de bord, fiches joueurs, calendrier (lecture).",
  },
];

export function roleForProfileSelect(storedRole: string): AppRole {
  const r = (storedRole ?? "").toLowerCase();
  if (r === "viewer" || r === "joueur") return "joueur";
  if (r === "admin") return "admin";
  if (r === "coach") return "coach";
  if (r === "entraineur") return "entraineur";
  if (r === "direction" || r === "directeur") return "direction";
  return "joueur";
}

export function roleToStore(selected: AppRole): string {
  return selected;
}

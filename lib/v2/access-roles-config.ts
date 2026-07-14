import type { AppRole } from "@/lib/types/app-roles";

/** Rôles proposés dans Paramètres → Gestion des utilisateurs */
export type ParametresAccessRole = "admin" | "direction" | "coach" | "viewer" | "custom";

export const PARAMETRES_ACCESS_ROLES: {
  value: ParametresAccessRole;
  label: string;
  description: string;
}[] = [
  {
    value: "admin",
    label: "Admin",
    description: "Accès total : toutes les rubriques, paramètres, utilisateurs et suppressions.",
  },
  {
    value: "direction",
    label: "Directeur",
    description: "Pilotage opérationnel : budget, rapports, historique — sans gestion des utilisateurs.",
  },
  {
    value: "coach",
    label: "Coach",
    description: "Planning, joueurs, stages, calendrier — sans budget ni paramètres.",
  },
  {
    value: "viewer",
    label: "Consultation",
    description: "Lecture seule sur le tableau de bord, joueurs, stages et calendrier.",
  },
  {
    value: "custom",
    label: "Personnalisé",
    description: "Whitelist manuelle : choisissez rubrique par rubrique (consultation et modification).",
  },
];

/** Rôles proposés à l'invitation (sans personnalisé). */
export const INVITE_ACCESS_ROLES = PARAMETRES_ACCESS_ROLES.filter((r) => r.value !== "custom");

export function parametresRoleLabel(role: ParametresAccessRole): string {
  return PARAMETRES_ACCESS_ROLES.find((r) => r.value === role)?.label ?? role;
}

export function roleForProfileSelect(
  storedRole: string,
  hasCustom = false
): ParametresAccessRole {
  if (hasCustom) return "custom";
  const r = (storedRole ?? "").toLowerCase();
  if (r === "admin") return "admin";
  if (r === "direction" || r === "directeur") return "direction";
  if (r === "coach" || r === "entraineur") return "coach";
  if (r === "viewer" || r === "joueur" || r === "staff") return "viewer";
  return "viewer";
}

export function roleToStore(selected: ParametresAccessRole): string {
  if (selected === "custom") return "viewer";
  return selected;
}

/** Compat legacy — map vers AppRole */
export function toAppRole(selected: ParametresAccessRole): AppRole {
  if (selected === "custom") return "viewer";
  if (selected === "direction") return "direction";
  return selected;
}

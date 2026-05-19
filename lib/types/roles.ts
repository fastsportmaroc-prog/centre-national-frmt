/** Rôles utilisateurs FRMT — permissions à brancher sur Supabase Auth */

export type RoleUtilisateur =
  | "admin"
  | "directeur"
  | "entraineur"
  | "logisticien"
  | "joueur";

export const ROLES_UTILISATEUR: { value: RoleUtilisateur; label: string }[] = [
  { value: "admin", label: "Administrateur" },
  { value: "directeur", label: "Directeur" },
  { value: "entraineur", label: "Entraîneur" },
  { value: "logisticien", label: "Logisticien" },
  { value: "joueur", label: "Joueur" },
];

export type PermissionModule =
  | "stages"
  | "occupation"
  | "joueurs"
  | "entraineurs"
  | "hebergement"
  | "logistique"
  | "budget"
  | "import_excel"
  | "admin";

const ROLE_PERMISSIONS: Record<RoleUtilisateur, PermissionModule[]> = {
  admin: [
    "stages",
    "occupation",
    "joueurs",
    "entraineurs",
    "hebergement",
    "logistique",
    "budget",
    "import_excel",
    "admin",
  ],
  directeur: [
    "stages",
    "occupation",
    "joueurs",
    "entraineurs",
    "hebergement",
    "logistique",
    "budget",
  ],
  entraineur: ["stages", "joueurs", "occupation", "entraineurs"],
  logisticien: ["stages", "occupation", "hebergement", "logistique", "budget"],
  joueur: ["joueurs"],
};

export function roleCan(role: RoleUtilisateur, module: PermissionModule): boolean {
  return ROLE_PERMISSIONS[role]?.includes(module) ?? false;
}

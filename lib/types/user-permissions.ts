export const PERMISSION_MODULE_KEYS = [
  "dashboard",
  "players",
  "coaches",
  "stages",
  "planning",
  "kinesitherapy",
  "accommodation",
  "catering",
  "courts",
  "equipment",
  "documents",
  "budgets",
  "passports_visas",
  "history",
  "reports",
  "statistics",
  "settings",
] as const;

export type PermissionModuleKey = (typeof PERMISSION_MODULE_KEYS)[number];

export type UserPermission = {
  id?: string;
  user_id: string;
  module_key: PermissionModuleKey;
  can_view: boolean;
  can_edit: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PermissionAction = "view" | "edit";

export const MODULE_LABELS: Record<PermissionModuleKey, string> = {
  dashboard: "Dashboard",
  players: "Joueurs",
  coaches: "Entraîneurs",
  stages: "Stages",
  planning: "Planning",
  kinesitherapy: "Kinésithérapie",
  accommodation: "Hébergement",
  catering: "Restauration",
  courts: "Terrains",
  equipment: "Matériel",
  documents: "Documents",
  budgets: "Budgets",
  passports_visas: "Passeports / Visas",
  history: "Historique",
  reports: "Rapports",
  statistics: "Statistiques",
  settings: "Paramètres",
};

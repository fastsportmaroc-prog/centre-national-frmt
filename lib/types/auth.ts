import type { AppRole } from "./app-roles";
import type { RoleUtilisateur } from "./roles";

export type UserRole = "admin" | "staff";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  nom?: string | null;
  prenom?: string | null;
  role: string;
  frmt_role?: string | null;
  entraineur_id?: string | null;
  avatar_url?: string | null;
  actif?: boolean | null;
  created_at: string;
};

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  appRole: AppRole;
  frmtRole: RoleUtilisateur;
  fullName: string | null;
  prenom: string | null;
  nom: string | null;
  isMock: boolean;
};

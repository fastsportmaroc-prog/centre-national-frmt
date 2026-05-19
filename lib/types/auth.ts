export type UserRole = "admin" | "staff";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  frmt_role?: string | null;
  created_at: string;
};

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  frmtRole: string | null;
  fullName: string | null;
  isMock: boolean;
};

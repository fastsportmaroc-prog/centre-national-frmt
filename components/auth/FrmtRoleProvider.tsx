"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { resolveFrmtRole } from "@/lib/auth/permissions";
import type { RoleUtilisateur } from "@/lib/types/roles";

type FrmtRoleContextValue = {
  frmtRole: RoleUtilisateur;
  refreshRole: () => void;
};

const FrmtRoleContext = createContext<FrmtRoleContextValue>({
  frmtRole: "directeur",
  refreshRole: () => {},
});

export function FrmtRoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [frmtRole, setFrmtRoleState] = useState<RoleUtilisateur>("directeur");

  const refreshRole = useCallback(() => {
    setFrmtRoleState(resolveFrmtRole(user));
  }, [user]);

  useEffect(() => {
    refreshRole();
  }, [refreshRole]);

  return (
    <FrmtRoleContext.Provider value={{ frmtRole, refreshRole }}>
      {children}
    </FrmtRoleContext.Provider>
  );
}

export function useFrmtRole() {
  return useContext(FrmtRoleContext);
}

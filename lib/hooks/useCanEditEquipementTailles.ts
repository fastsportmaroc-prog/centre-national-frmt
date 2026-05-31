"use client";

import { useRole } from "@/lib/hooks/useRole";

/** Qui peut saisir / enregistrer les tailles textiles & chaussures sur les fiches. */
export function useCanEditEquipementTailles(): boolean {
  const { canWrite, role, isAdmin } = useRole();
  return (
    canWrite ||
    isAdmin ||
    role === "direction" ||
    role === "viewer" ||
    role === "entraineur"
  );
}

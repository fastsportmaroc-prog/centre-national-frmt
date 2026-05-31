"use client";

import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { UsersAccessPanel } from "@/components/v2/parametres/UsersAccessPanel";

export function UtilisateursV2Client() {
  return (
    <>
      <V2PageHeader
        title="Utilisateurs"
        description="Gestion complète des comptes et rôles — administrateur uniquement"
      />
      <main className="p-4 sm:p-6">
        <UsersAccessPanel showAdvancedLink={false} />
      </main>
    </>
  );
}

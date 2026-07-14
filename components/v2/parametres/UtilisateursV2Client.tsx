"use client";

import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { UsersAccessPanel } from "@/components/v2/parametres/UsersAccessPanel";

export function UtilisateursV2Client() {
  return (
    <>
      <V2PageHeader
        title="Gestion des utilisateurs"
        description="Attribuez un rôle et limitez l'accès aux rubriques de l'application — administrateur uniquement"
      />
      <main className="p-4 sm:p-6">
        <UsersAccessPanel showAdvancedLink={false} />
      </main>
    </>
  );
}

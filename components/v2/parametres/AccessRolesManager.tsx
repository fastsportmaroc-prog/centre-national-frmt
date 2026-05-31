"use client";

import { Card } from "@/components/ui/Card";
import { PARAMETRES_ACCESS_ROLES } from "@/lib/v2/access-roles-config";
import { UsersAccessPanel } from "@/components/v2/parametres/UsersAccessPanel";

export function AccessRolesManager() {
  const roleOptions = PARAMETRES_ACCESS_ROLES.map((r) => ({
    value: r.value,
    label: r.label,
  }));

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="font-semibold">Accès Admin, Coach &amp; Joueur</h2>
        <p className="mt-1 text-sm text-muted">
          Définissez qui peut se connecter et ce qu&apos;il voit dans l&apos;application V2.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {PARAMETRES_ACCESS_ROLES.map((r) => (
          <div
            key={r.value}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/30 p-3"
          >
            <p className="font-medium text-[var(--frmt-gold)]">{r.label}</p>
            <p className="mt-1 text-xs text-muted leading-relaxed">{r.description}</p>
          </div>
        ))}
      </div>

      <UsersAccessPanel
        roleOptions={roleOptions}
        defaultInviteRole="joueur"
        hideCoachLink
        showAdvancedLink
      />
    </Card>
  );
}

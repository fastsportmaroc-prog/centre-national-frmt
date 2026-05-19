"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label, Select } from "@/components/ui/Input";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFrmtRole } from "@/components/auth/FrmtRoleProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ROLES_UTILISATEUR, type RoleUtilisateur } from "@/lib/types/roles";

export function ParametresDemoRole() {
  const { user, refresh } = useAuth();
  const { frmtRole, refreshRole } = useFrmtRole();
  const [role, setRole] = useState<RoleUtilisateur>(frmtRole);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) throw new Error("Supabase indisponible");
      const { error } = await supabase
        .from("profiles")
        .update({ frmt_role: role })
        .eq("id", user.id);
      if (error) throw new Error(error.message);
      await refresh();
      refreshRole();
      setMessage("Rôle FRMT enregistré.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card premium>
      <h2 className="font-semibold">Rôle FRMT</h2>
      <p className="mt-2 text-sm text-muted">
        Définit les droits d&apos;accès au menu (entraîneur, logisticien, directeur, etc.).
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
          <Label>Rôle</Label>
          <Select value={role} onChange={(ev) => setRole(ev.target.value as RoleUtilisateur)}>
            {ROLES_UTILISATEUR.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
      {message && <p className="mt-2 text-sm text-tennis">{message}</p>}
    </Card>
  );
}

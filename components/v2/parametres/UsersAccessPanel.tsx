"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import { permissionsForRole } from "@/lib/auth/app-permissions";
import { authUserIsAppAdmin } from "@/lib/auth/admin-access";
import {
  INVITE_ACCESS_ROLES,
  parametresRoleLabel,
  roleForProfileSelect,
  roleToStore,
  toAppRole,
  type ParametresAccessRole,
} from "@/lib/v2/access-roles-config";
import { getEntraineurs } from "@/lib/supabase/queries";
import { UserAccessModal } from "@/components/v2/parametres/UserAccessModal";

export type ProfileRow = {
  id: string;
  email: string | null;
  nom: string | null;
  prenom: string | null;
  full_name: string | null;
  role: string;
  entraineur_id: string | null;
  actif: boolean;
  hasCustom?: boolean;
};

type Props = {
  hideCoachLink?: boolean;
  showAdvancedLink?: boolean;
};

export function UsersAccessPanel({
  hideCoachLink = false,
  showAdvancedLink = true,
}: Props) {
  const { user, loading: authLoading } = useAuth();
  const canManage =
    !!user && permissionsForRole(resolveEffectiveAppRole(user)).canManageUsers;
  const { toast } = useToast();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [entraineurs, setEntraineurs] = useState<{ id: string; label: string }[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ParametresAccessRole>("viewer");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<ProfileRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch("/api/admin/users", { credentials: "include" });
        if (res.ok) {
          const body = (await res.json()) as { users: ProfileRow[] };
          setUsers(body.users ?? []);
          if (!hideCoachLink) {
            const e = await getEntraineurs();
            setEntraineurs(e.map((x) => ({ id: x.id, label: `${x.prenom} ${x.nom}` })));
          }
          return;
        }
        if (res.status === 403 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        toast(errBody.error ?? "Impossible de charger les utilisateurs", "error");
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [toast, hideCoachLink]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!permissionsForRole(resolveEffectiveAppRole(user)).canManageUsers) return;
    void load();
  }, [authLoading, user, load]);

  async function patchUser(id: string, patch: Partial<ProfileRow>) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!res.ok) {
      toast("Mise à jour échouée", "error");
      return;
    }
    toast("Mis à jour");
    await load();
  }

  async function invite() {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: roleToStore(inviteRole) }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast(body.error ?? "Invitation échouée", "error");
      return;
    }
    toast("Invitation envoyée");
    setInviteOpen(false);
    setInviteEmail("");
    await load();
  }

  function displayName(u: ProfileRow) {
    if (u.prenom || u.nom) return `${u.prenom ?? ""} ${u.nom ?? ""}`.trim();
    return u.full_name ?? u.email ?? "Utilisateur";
  }

  function isRowAdmin(u: ProfileRow) {
    const parametresRole = roleForProfileSelect(u.role, u.hasCustom);
    return (
      u.role === "admin" ||
      authUserIsAppAdmin(
        {
          id: u.id,
          email: u.email ?? "",
          role: u.role === "admin" ? "admin" : "staff",
          appRole: toAppRole(parametresRole),
          frmtRole: "joueur",
          fullName: u.full_name,
          prenom: u.prenom,
          nom: u.nom,
          isMock: false,
        },
        { hasCustomPermissions: parametresRole === "custom" || !!u.hasCustom }
      )
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Gérez les rôles et les rubriques accessibles pour chaque compte.
        </p>
        <div className="flex flex-wrap gap-2">
          {showAdvancedLink && (
            <Link
              href="/v2/parametres/utilisateurs"
              className="inline-flex h-8 items-center rounded-md border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--bg-elevated)]"
            >
              Page complète →
            </Link>
          )}
          {canManage && (
            <Button type="button" size="sm" className="gap-1" onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4" /> Inviter
            </Button>
          )}
        </div>
      </div>

      <Card className="mt-3 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase text-muted">
              <th className="p-3">Nom</th>
              <th className="p-3">Email</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Statut</th>
              {!hideCoachLink && <th className="p-3">Entraîneur lié</th>}
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={hideCoachLink ? 5 : 6} className="p-4 text-muted">
                  Chargement…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={hideCoachLink ? 5 : 6} className="p-4 text-muted">
                  Aucun utilisateur.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const accessRole = roleForProfileSelect(u.role, u.hasCustom);
                return (
                  <tr key={u.id} className="border-b border-[var(--border)]/40">
                    <td className="p-3 font-medium">{displayName(u)}</td>
                    <td className="p-3">{u.email ?? "—"}</td>
                    <td className="p-3">
                      <span className="inline-flex rounded-full bg-[var(--bg-elevated)] px-2.5 py-0.5 text-xs font-medium">
                        {parametresRoleLabel(accessRole)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={
                          u.actif !== false
                            ? "text-emerald-600 text-xs font-medium"
                            : "text-red-500 text-xs font-medium"
                        }
                      >
                        {u.actif !== false ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    {!hideCoachLink && (
                      <td className="p-3">
                        <Select
                          className="min-w-[140px]"
                          value={u.entraineur_id ?? ""}
                          onChange={(e) =>
                            void patchUser(u.id, { entraineur_id: e.target.value || null })
                          }
                        >
                          <option value="">—</option>
                          {entraineurs.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.label}
                            </option>
                          ))}
                        </Select>
                      </td>
                    )}
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="gap-1"
                          onClick={() => setEditUser(u)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Droits d&apos;accès
                        </Button>
                        <label className="flex items-center gap-1.5 text-xs text-muted">
                          <input
                            type="checkbox"
                            checked={u.actif !== false}
                            onChange={(e) => void patchUser(u.id, { actif: e.target.checked })}
                          />
                          Actif
                        </label>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {editUser && (
        <UserAccessModal
          open={!!editUser}
          onClose={() => setEditUser(null)}
          userId={editUser.id}
          userLabel={displayName(editUser)}
          userEmail={editUser.email}
          isAdminUser={isRowAdmin(editUser)}
          initialRole={roleForProfileSelect(editUser.role, editUser.hasCustom)}
          initialHasCustom={!!editUser.hasCustom}
          onSaved={() => void load()}
        />
      )}

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Inviter un utilisateur">
        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="nom@frmt.ma"
            />
          </div>
          <div>
            <Label>Rôle initial</Label>
            <Select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as ParametresAccessRole)}
            >
              {INVITE_ACCESS_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" onClick={() => void invite()}>
            Envoyer l&apos;invitation
          </Button>
        </div>
      </Modal>
    </>
  );
}

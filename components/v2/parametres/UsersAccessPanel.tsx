"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/v2/ui/ToastProvider";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import { permissionsForRole } from "@/lib/auth/app-permissions";
import { APP_ROLES, type AppRole } from "@/lib/types/app-roles";
import { roleForProfileSelect, roleToStore } from "@/lib/v2/access-roles-config";
import { getEntraineurs } from "@/lib/supabase/queries";

export type ProfileRow = {
  id: string;
  email: string | null;
  nom: string | null;
  prenom: string | null;
  full_name: string | null;
  role: string;
  entraineur_id: string | null;
  actif: boolean;
};

type RoleOption = { value: AppRole; label: string };

type Props = {
  /** Rôles proposés à l'invitation et dans le sélecteur (défaut : tous) */
  roleOptions?: RoleOption[];
  defaultInviteRole?: AppRole;
  /** Masquer la colonne entraîneur lié */
  hideCoachLink?: boolean;
  /** Lien vers la page utilisateurs complète */
  showAdvancedLink?: boolean;
};

export function UsersAccessPanel({
  roleOptions,
  defaultInviteRole = "joueur",
  hideCoachLink = false,
  showAdvancedLink = true,
}: Props) {
  const roles = roleOptions ?? APP_ROLES.map((r) => ({ value: r.value, label: r.label }));
  const { user, loading: authLoading } = useAuth();
  const canManage =
    !!user && permissionsForRole(resolveEffectiveAppRole(user)).canManageUsers;
  const { toast } = useToast();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [entraineurs, setEntraineurs] = useState<{ id: string; label: string }[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>(defaultInviteRole);
  const [loading, setLoading] = useState(true);

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

  async function patchUser(id: string, patch: Partial<ProfileRow> & { role?: string }) {
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
    toast("Accès mis à jour");
    await load();
  }

  async function invite() {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: roleToStore(inviteRole as AppRole) }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      if (res.status === 403) {
        toast(
          body.error ??
            "Accès refusé. Vérifiez que votre compte a le rôle admin dans Supabase (profiles.role).",
          "error"
        );
        return;
      }
      if (res.status === 503) {
        toast(
          body.error ??
            "Ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local pour envoyer des invitations.",
          "error"
        );
        return;
      }
      toast(body.error ?? "Invitation échouée", "error");
      return;
    }
    toast("Invitation envoyée");
    setInviteOpen(false);
    setInviteEmail("");
    await load();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Comptes connectés à l&apos;application — attribuez un rôle Admin, Coach ou Joueur.
        </p>
        <div className="flex flex-wrap gap-2">
          {showAdvancedLink && (
            <Link
              href="/v2/parametres/utilisateurs"
              className="inline-flex h-8 items-center rounded-md border border-[var(--border)] px-3 text-sm font-medium hover:bg-[var(--bg-elevated)]"
            >
              Tous les rôles →
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
              <th className="p-3">Accès</th>
              {!hideCoachLink && <th className="p-3">Entraîneur lié</th>}
              <th className="p-3">Actif</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={hideCoachLink ? 4 : 5} className="p-4 text-muted">
                  Chargement…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={hideCoachLink ? 4 : 5} className="p-4 text-muted">
                  Aucun utilisateur.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const selectedRole = roleForProfileSelect(u.role);
                return (
                  <tr key={u.id} className="border-b border-[var(--border)]/40">
                    <td className="p-3">
                      {u.prenom || u.nom
                        ? `${u.prenom ?? ""} ${u.nom ?? ""}`.trim()
                        : u.full_name ?? "—"}
                    </td>
                    <td className="p-3">{u.email ?? "—"}</td>
                    <td className="p-3">
                      <Select
                        className="min-w-[140px]"
                        value={selectedRole}
                        onChange={(e) =>
                          void patchUser(u.id, { role: roleToStore(e.target.value as AppRole) })
                        }
                      >
                        {roles.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </Select>
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
                      <input
                        type="checkbox"
                        checked={u.actif !== false}
                        onChange={(e) => void patchUser(u.id, { actif: e.target.checked })}
                        aria-label="Compte actif"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Inviter un utilisateur">
        <div className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="nom@exemple.ma"
            />
          </div>
          <div>
            <Label>Type d&apos;accès</Label>
            <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              {roles.map((r) => (
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

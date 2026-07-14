"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/v2/ui/ToastProvider";
import {
  buildRolePermissionPreset,
  draftFromPermissions,
  draftToPermissionPayload,
  parametresRoleToAppRole,
} from "@/lib/auth/role-permission-presets";
import type { PermissionModuleKey, UserPermission } from "@/lib/types/user-permissions";
import {
  PARAMETRES_ACCESS_ROLES,
  roleToStore,
  type ParametresAccessRole,
} from "@/lib/v2/access-roles-config";
import {
  AdminUserPermissionsForm,
  type PermissionDraft,
} from "@/components/v2/parametres/AdminUserPermissionsForm";
import {
  AdminUserPlayerCategoriesForm,
  defaultJuniorsCategorySet,
} from "@/components/v2/parametres/AdminUserPlayerCategoriesForm";
import { useAgeCategories } from "@/lib/hooks/useAgeCategories";
import { ELITE_PRO_CODE } from "@/lib/constants/official-categories";

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  userLabel: string;
  userEmail: string | null;
  isAdminUser: boolean;
  initialRole: ParametresAccessRole;
  initialHasCustom: boolean;
  onSaved: () => void;
};

type Draft = PermissionDraft;

function emptyDraft(): Draft {
  return draftFromPermissions([]);
}

export function UserAccessModal({
  open,
  onClose,
  userId,
  userLabel,
  userEmail,
  isAdminUser,
  initialRole,
  initialHasCustom,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const { categories } = useAgeCategories();
  const categoryCodes = categories.map((c) => c.code);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accessRole, setAccessRole] = useState<ParametresAccessRole>(initialRole);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [limitCategories, setLimitCategories] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/permissions?userId=${userId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        toast("Impossible de charger les droits", "error");
        return;
      }
      const body = (await res.json()) as {
        permissions: UserPermission[];
        playerCategories?: string[];
        hasCustom: boolean;
        hasCategoryRestrictions?: boolean;
      };
      const role = initialHasCustom || body.hasCustom ? "custom" : initialRole;
      setAccessRole(role);

      if (role === "custom" && (body.permissions?.length ?? 0) > 0) {
        setDraft(
          draftFromPermissions(
            body.permissions.map((p) => ({
              module_key: p.module_key,
              can_view: p.can_view,
              can_edit: p.can_edit,
            }))
          )
        );
      } else if (role !== "custom" && role !== "admin") {
        setDraft(draftFromPermissions(buildRolePermissionPreset(parametresRoleToAppRole(role))));
      } else {
        setDraft(emptyDraft());
      }

      const cats = body.playerCategories ?? [];
      setLimitCategories(!!body.hasCategoryRestrictions && cats.length > 0);
      setSelectedCategories(new Set(cats));
    } finally {
      setLoading(false);
    }
  }, [userId, initialRole, initialHasCustom, toast]);

  useEffect(() => {
    if (open) {
      setAccessRole(initialHasCustom ? "custom" : initialRole);
      void load();
    }
  }, [open, initialRole, initialHasCustom, load]);

  function onRoleChange(role: ParametresAccessRole) {
    setAccessRole(role);
    if (role === "custom") return;
    if (role === "admin") {
      setDraft(emptyDraft());
      setLimitCategories(false);
      setSelectedCategories(new Set());
      return;
    }
    setDraft(draftFromPermissions(buildRolePermissionPreset(parametresRoleToAppRole(role))));
    setLimitCategories(false);
    setSelectedCategories(new Set());
  }

  function toggleView(key: PermissionModuleKey) {
    setDraft((prev) => {
      const next = { ...prev };
      const can_view = !prev[key].can_view;
      next[key] = { can_view, can_edit: can_view ? prev[key].can_edit : false };
      return next;
    });
  }

  function toggleEdit(key: PermissionModuleKey) {
    setDraft((prev) => {
      if (!prev[key].can_view) return prev;
      const next = { ...prev };
      next[key] = { ...prev[key], can_edit: !prev[key].can_edit };
      return next;
    });
  }

  function toggleCategory(code: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const roleRes = await fetch("/api/admin/users", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: roleToStore(accessRole) }),
      });
      if (!roleRes.ok) {
        toast("Mise à jour du rôle échouée", "error");
        return;
      }

      const playerCategories =
        accessRole === "custom" && limitCategories ? [...selectedCategories] : null;

      if (accessRole === "admin") {
        await fetch(`/api/admin/users/permissions?userId=${userId}`, {
          method: "DELETE",
          credentials: "include",
        });
      } else if (accessRole === "custom") {
        const permissions = draftToPermissionPayload(draft).filter((p) => p.can_view);
        const permRes = await fetch("/api/admin/users/permissions", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, permissions, playerCategories }),
        });
        if (!permRes.ok) {
          toast("Enregistrement des droits échoué", "error");
          return;
        }
      } else {
        await fetch(`/api/admin/users/permissions?userId=${userId}`, {
          method: "DELETE",
          credentials: "include",
        });
      }

      toast("Accès enregistrés — l'utilisateur doit se reconnecter pour voir les changements");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const isCustom = accessRole === "custom";
  const showModules = accessRole !== "admin";

  return (
    <Modal open={open} onClose={onClose} title="Droits d'accès utilisateur">
      <div className="space-y-4 max-h-[min(85vh,720px)] overflow-y-auto pr-1">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/40 p-3 text-sm">
          <p className="font-medium">{userLabel}</p>
          <p className="text-muted">{userEmail ?? "—"}</p>
        </div>

        {isAdminUser && accessRole === "admin" ? (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Shield className="h-4 w-4" />
            Cet utilisateur a l&apos;accès administrateur total.
          </p>
        ) : (
          <>
            <div>
              <Label>Rôle</Label>
              <Select
                value={accessRole}
                onChange={(e) => onRoleChange(e.target.value as ParametresAccessRole)}
                disabled={loading}
              >
                {PARAMETRES_ACCESS_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted">
                {PARAMETRES_ACCESS_ROLES.find((r) => r.value === accessRole)?.description}
              </p>
            </div>

            {showModules && (
              <AdminUserPermissionsForm
                draft={draft}
                editable={isCustom}
                showEditColumn={isCustom}
                loading={loading}
                onToggleView={toggleView}
                onToggleEdit={toggleEdit}
              />
            )}

            {isCustom && (
              <AdminUserPlayerCategoriesForm
                selected={selectedCategories}
                editable={isCustom}
                limitEnabled={limitCategories}
                onLimitEnabledChange={setLimitCategories}
                onToggle={toggleCategory}
                onSelectAll={() => setSelectedCategories(new Set(categoryCodes))}
                onSelectNone={() => setSelectedCategories(new Set())}
                onSelectJuniors={() =>
                  setSelectedCategories(defaultJuniorsCategorySet(categoryCodes))
                }
                onSelectElitePro={() => setSelectedCategories(new Set([ELITE_PRO_CODE]))}
              />
            )}
          </>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving || loading}>
            Enregistrer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

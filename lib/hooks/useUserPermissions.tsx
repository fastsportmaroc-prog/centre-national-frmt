"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { authUserIsAppAdmin } from "@/lib/auth/admin-access";
import { checkPathPermission, checkPermission, hasCustomPermissions } from "@/lib/auth/check-permission";
import {
  canViewJoueurCategory,
  filterJoueursByCategory,
  hasPlayerCategoryRestrictions,
  type JoueurCategoryFields,
} from "@/lib/auth/player-category-access";
import {
  buildPlayerCategoryContext,
  bypassPlayerCategoryFilter,
  filterByEntityCategory,
  lockedCategoryLabel,
  sanitizeCategoryParam,
  type PlayerCategoryContext,
} from "@/lib/auth/player-category-context";
import { HREF_TO_MODULE } from "@/lib/auth/module-registry";
import {
  DEFAULT_PLANNING_CNE_ACCESS,
  type PlanningCneAccessInfo,
} from "@/lib/auth/planning-cne-access";
import { resolveEffectiveAppRole } from "@/lib/auth/passeports-access";
import { normalizeAppRole } from "@/lib/types/app-roles";
import type { PermissionAction, PermissionModuleKey, UserPermission } from "@/lib/types/user-permissions";
import type { V2NavSection } from "@/components/v2/nav-items";

type UserPermissionsContextValue = {
  permissions: UserPermission[];
  playerCategories: string[];
  categoryContext: PlayerCategoryContext;
  planningCne: PlanningCneAccessInfo;
  loading: boolean;
  hasCustom: boolean;
  hasCategoryRestrictions: boolean;
  bypassCategoryFilter: boolean;
  lockedCategoryLabel: string;
  isAdmin: boolean;
  canView: (moduleKey: PermissionModuleKey) => boolean;
  canEdit: (moduleKey: PermissionModuleKey) => boolean;
  canAccessPath: (pathname: string, action?: PermissionAction) => boolean;
  canViewJoueur: (joueur: JoueurCategoryFields) => boolean;
  filterJoueurs: <T extends JoueurCategoryFields>(list: T[]) => T[];
  filterByCategory: <T>(
    list: T[],
    getCategory: (item: T) => string | null | undefined
  ) => T[];
  sanitizeCategoryParam: (requested: string | null | undefined) => string | undefined;
  filterNavSections: (sections: V2NavSection[]) => V2NavSection[];
  refresh: () => Promise<void>;
};

const UserPermissionsContext = createContext<UserPermissionsContextValue | null>(null);

type ProviderProps = {
  children: ReactNode;
  initialPermissions?: UserPermission[];
  initialPlayerCategories?: string[];
};

export function UserPermissionsProvider({
  children,
  initialPermissions = [],
  initialPlayerCategories = [],
}: ProviderProps) {
  const { user, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<UserPermission[]>(initialPermissions);
  const [playerCategories, setPlayerCategories] = useState<string[]>(initialPlayerCategories);
  const [planningCne, setPlanningCne] = useState<PlanningCneAccessInfo>(DEFAULT_PLANNING_CNE_ACCESS);
  // Le layout serveur a déjà calculé le snapshot (éventuellement vide pour un admin) :
  // ne pas démarrer en "loading" sinon SSR et client divergent / flash « Vérification… ».
  const [loading, setLoading] = useState(false);

  const hasCustom = hasCustomPermissions(permissions);
  const hasCategoryRestrictions = hasPlayerCategoryRestrictions(playerCategories);
  const isAdmin = user ? authUserIsAppAdmin(user, { hasCustomPermissions: hasCustom }) : false;
  const role = user ? normalizeAppRole(resolveEffectiveAppRole(user)) : "viewer";
  const bypassCategoryFilter = bypassPlayerCategoryFilter(role, isAdmin);
  const categoryContext = buildPlayerCategoryContext(role, isAdmin, playerCategories);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user?.id) {
        setPermissions([]);
        setPlayerCategories([]);
        setPlanningCne(DEFAULT_PLANNING_CNE_ACCESS);
        setLoading(false);
        return;
      }

      if (!opts?.silent) setLoading(true);
      try {
        const res = await fetch(`/api/auth/my-permissions?t=${Date.now()}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          setPermissions([]);
          setPlayerCategories([]);
          setPlanningCne(DEFAULT_PLANNING_CNE_ACCESS);
          return;
        }
        const body = (await res.json()) as {
          permissions: UserPermission[];
          playerCategories?: string[];
          planningCne?: PlanningCneAccessInfo;
        };
        setPermissions(
          (body.permissions ?? []).map((r) => ({
            user_id: user.id,
            module_key: r.module_key,
            can_view: r.can_view,
            can_edit: r.can_edit,
          }))
        );
        setPlayerCategories(body.playerCategories ?? []);
        setPlanningCne(body.planningCne ?? DEFAULT_PLANNING_CNE_ACCESS);
      } catch {
        setPermissions([]);
        setPlayerCategories([]);
        setPlanningCne(DEFAULT_PLANNING_CNE_ACCESS);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (authLoading) return;
    // Snapshot SSR déjà fourni → refresh silencieux (évite un 2e rendu « loading » à l’hydratation).
    void load({ silent: true });
  }, [authLoading, load]);

  useEffect(() => {
    if (authLoading || !user) return;
    const refresh = () => void load({ silent: true });
    window.addEventListener("focus", refresh);
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [authLoading, user, load]);

  const canView = useCallback(
    (moduleKey: PermissionModuleKey) => checkPermission(user, role, permissions, moduleKey, "view"),
    [user, role, permissions]
  );

  const canEdit = useCallback(
    (moduleKey: PermissionModuleKey) => checkPermission(user, role, permissions, moduleKey, "edit"),
    [user, role, permissions]
  );

  const canAccessPath = useCallback(
    (pathname: string, action: PermissionAction = "view") =>
      checkPathPermission(user, role, permissions, pathname, action),
    [user, role, permissions]
  );

  const canViewJoueur = useCallback(
    (joueur: JoueurCategoryFields) =>
      canViewJoueurCategory(joueur, playerCategories, bypassCategoryFilter),
    [playerCategories, bypassCategoryFilter]
  );

  const filterJoueurs = useCallback(
    <T extends JoueurCategoryFields>(list: T[]) =>
      filterJoueursByCategory(list, playerCategories, bypassCategoryFilter),
    [playerCategories, bypassCategoryFilter]
  );

  const filterByCategory = useCallback(
    <T,>(list: T[], getCategory: (item: T) => string | null | undefined) =>
      filterByEntityCategory(list, getCategory, categoryContext),
    [categoryContext]
  );

  const sanitizeCategoryParamFn = useCallback(
    (requested: string | null | undefined) =>
      sanitizeCategoryParam(requested, categoryContext),
    [categoryContext]
  );

  const filterNavSections = useCallback(
    (sections: V2NavSection[]): V2NavSection[] => {
      if (isAdmin) return sections;
      if (loading) return [];

      return sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => {
            const moduleKey = HREF_TO_MODULE[item.href];
            if (!moduleKey) return hasCustom ? false : canAccessPath(item.href);
            return canView(moduleKey);
          }),
        }))
        .filter((section) => section.items.length > 0);
    },
    [isAdmin, loading, hasCustom, canView, canAccessPath]
  );

  const value = useMemo(
    () => ({
      permissions,
      playerCategories,
      categoryContext,
      planningCne,
      loading: authLoading || loading,
      hasCustom,
      hasCategoryRestrictions,
      bypassCategoryFilter,
      lockedCategoryLabel: lockedCategoryLabel(playerCategories),
      isAdmin,
      canView,
      canEdit,
      canAccessPath,
      canViewJoueur,
      filterJoueurs,
      filterByCategory,
      sanitizeCategoryParam: sanitizeCategoryParamFn,
      filterNavSections,
      refresh: load,
    }),
    [
      permissions,
      playerCategories,
      categoryContext,
      planningCne,
      authLoading,
      loading,
      hasCustom,
      hasCategoryRestrictions,
      bypassCategoryFilter,
      isAdmin,
      canView,
      canEdit,
      canAccessPath,
      canViewJoueur,
      filterJoueurs,
      filterByCategory,
      sanitizeCategoryParamFn,
      filterNavSections,
      load,
    ]
  );

  return (
    <UserPermissionsContext.Provider value={value}>{children}</UserPermissionsContext.Provider>
  );
}

export function useUserPermissions(): UserPermissionsContextValue {
  const ctx = useContext(UserPermissionsContext);
  if (!ctx) {
    throw new Error("useUserPermissions must be used within UserPermissionsProvider");
  }
  return ctx;
}

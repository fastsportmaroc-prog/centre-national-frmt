"use client";

import { Label } from "@/components/ui/Input";
import {
  MODULE_LABELS,
  PERMISSION_MODULE_KEYS,
  type PermissionModuleKey,
} from "@/lib/types/user-permissions";

export type PermissionDraft = Record<
  PermissionModuleKey,
  { can_view: boolean; can_edit: boolean }
>;

type Props = {
  draft: PermissionDraft;
  editable: boolean;
  showEditColumn?: boolean;
  loading?: boolean;
  onToggleView: (key: PermissionModuleKey) => void;
  onToggleEdit: (key: PermissionModuleKey) => void;
};

/** Formulaire admin — rubriques autorisées par utilisateur. */
export function AdminUserPermissionsForm({
  draft,
  editable,
  showEditColumn = true,
  loading = false,
  onToggleView,
  onToggleEdit,
}: Props) {
  return (
    <div>
      <Label className="mb-2 block text-sm font-medium">Droits d&apos;accès — rubriques</Label>
      {loading ? (
        <p className="text-xs text-muted">Chargement…</p>
      ) : (
        <div className="max-h-[min(50vh,360px)] overflow-y-auto rounded-lg border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--bg-elevated)] text-xs uppercase text-muted">
              <tr>
                <th className="p-2 text-left">Rubrique</th>
                <th className="w-24 p-2 text-center">Consulter</th>
                {showEditColumn && <th className="w-24 p-2 text-center">Modifier</th>}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MODULE_KEYS.map((key) => (
                <tr key={key} className="border-t border-[var(--border)]/50">
                  <td className="p-2">{MODULE_LABELS[key]}</td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={draft[key].can_view}
                      onChange={() => onToggleView(key)}
                      disabled={!editable}
                      aria-label={`Consulter ${MODULE_LABELS[key]}`}
                    />
                  </td>
                  {showEditColumn && (
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={draft[key].can_edit}
                        onChange={() => onToggleEdit(key)}
                        disabled={!editable || !draft[key].can_view}
                        aria-label={`Modifier ${MODULE_LABELS[key]}`}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!editable && (
        <p className="mt-2 text-xs text-muted">
          Liste indicative du rôle sélectionné. Choisissez « Personnalisé » pour ajuster manuellement.
        </p>
      )}
    </div>
  );
}

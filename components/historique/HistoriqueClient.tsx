"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Select } from "@/components/ui/Input";
import { getHistorique } from "@/lib/audit/historique";
import type {
  ActionHistorique,
  HistoriqueEntry,
  HistoriqueFilters,
  ModuleHistorique,
} from "@/lib/types/historique";
import { formatDateTime } from "@/lib/utils/dates";
import { History } from "lucide-react";

const MODULES: { value: ModuleHistorique | ""; label: string }[] = [
  { value: "", label: "Tous les modules" },
  { value: "joueurs", label: "Joueurs" },
  { value: "groupes", label: "Groupes" },
  { value: "courts", label: "Courts" },
  { value: "reservations", label: "Réservations" },
  { value: "logistique", label: "Logistique" },
  { value: "billets", label: "Billets" },
  { value: "passeport", label: "Passeport" },
  { value: "performances", label: "Performances internationales" },
  { value: "infrastructures", label: "Infrastructures" },
  { value: "materiel", label: "Matériel" },
  { value: "budget", label: "Budget annuel" },
  { value: "budget_deplacement", label: "Budget déplacement" },
  { value: "rapports", label: "Rapports" },
  { value: "systeme", label: "Système" },
];

const ACTIONS: { value: ActionHistorique | ""; label: string }[] = [
  { value: "", label: "Toutes les actions" },
  { value: "creation", label: "Création" },
  { value: "modification", label: "Modification" },
  { value: "suppression", label: "Suppression" },
  { value: "validation", label: "Validation" },
  { value: "refus", label: "Refus" },
  { value: "annulation", label: "Annulation" },
  { value: "envoi_email", label: "Envoi email" },
  { value: "export", label: "Export" },
  { value: "imputation", label: "Imputation" },
];

function actionVariant(action: ActionHistorique) {
  if (action === "suppression" || action === "refus") return "danger" as const;
  if (action === "validation" || action === "creation") return "success" as const;
  if (action === "export") return "muted" as const;
  return "default" as const;
}

export function HistoriqueClient() {
  const [items, setItems] = useState<HistoriqueEntry[]>([]);
  const [filters, setFilters] = useState<HistoriqueFilters>({
    utilisateur: "",
    module: "",
    action: "",
    dateDebut: "",
    dateFin: "",
  });

  const load = useCallback(async () => {
    const f: HistoriqueFilters = {};
    if (filters.utilisateur) f.utilisateur = filters.utilisateur;
    if (filters.module) f.module = filters.module;
    if (filters.action) f.action = filters.action;
    if (filters.dateDebut) f.dateDebut = filters.dateDebut;
    if (filters.dateFin) f.dateFin = filters.dateFin;
    setItems(await getHistorique(f));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Historique"
        description="Journal d'audit des actions utilisateurs"
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <Label>Utilisateur</Label>
              <Input
                placeholder="Nom…"
                value={filters.utilisateur ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, utilisateur: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Module</Label>
              <Select
                value={filters.module ?? ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    module: e.target.value as HistoriqueFilters["module"],
                  })
                }
              >
                {MODULES.map((m) => (
                  <option key={m.value || "all"} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Action</Label>
              <Select
                value={filters.action ?? ""}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    action: e.target.value as HistoriqueFilters["action"],
                  })
                }
              >
                {ACTIONS.map((a) => (
                  <option key={a.value || "all"} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Du</Label>
              <Input
                type="date"
                value={filters.dateDebut ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, dateDebut: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Au</Label>
              <Input
                type="date"
                value={filters.dateFin ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, dateFin: e.target.value })
                }
              />
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          {items.length === 0 ? (
            <p className="text-center text-sm text-muted py-8">
              Aucune entrée pour ces filtres.
            </p>
          ) : (
            items.map((h) => (
              <Card key={h.id} className="!p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <History className="mt-0.5 h-4 w-4 shrink-0 text-tennis" />
                    <div>
                      <p className="font-medium">
                        {h.entite_label ?? h.module}{" "}
                        <span className="text-muted font-normal">
                          · {h.utilisateur_nom} ({h.utilisateur_role})
                        </span>
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {formatDateTime(h.created_at)}
                        {h.commentaire ? ` — ${h.commentaire}` : ""}
                      </p>
                      {(h.ancienne_valeur || h.nouvelle_valeur) && (
                        <p className="text-xs mt-1 text-muted">
                          {h.ancienne_valeur && <span>avant: {h.ancienne_valeur}</span>}
                          {h.ancienne_valeur && h.nouvelle_valeur && " → "}
                          {h.nouvelle_valeur && <span>après: {h.nouvelle_valeur}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="muted">{h.module}</Badge>
                    <Badge variant={actionVariant(h.action)}>{h.action}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </>
  );
}

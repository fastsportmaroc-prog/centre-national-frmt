"use client";

import { useEffect, useState } from "react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { AccessRolesManager } from "@/components/v2/parametres/AccessRolesManager";
import { CategoriesAgeManager } from "@/components/v2/parametres/CategoriesAgeManager";
import { InfrastructuresManager } from "@/components/v2/parametres/InfrastructuresManager";
import {
  BUDGET_TARIFS_DEFAULTS,
  getTarifsBudget,
  saveTarifsBudget,
} from "@/lib/v2/settings-store";
import type { TarifsBudgetSettings } from "@/lib/types/v2";

export function ParametresV2Client() {
  const [tarifsBudget, setTarifsBudget] = useState<TarifsBudgetSettings>(BUDGET_TARIFS_DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTarifsBudget(getTarifsBudget());
  }, []);

  function handleSaveBudget() {
    saveTarifsBudget(tarifsBudget);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <V2PageHeader title="Paramètres" description="Configuration V2 — Centre National FRMT" />
      <main className="max-w-3xl space-y-6 p-4 sm:p-6">
        <AccessRolesManager />
        <CategoriesAgeManager />
        <InfrastructuresManager />
        <Card className="space-y-4 p-4">
          <h2 className="font-semibold">Tarifs budget prévisionnel</h2>
          <p className="text-sm text-muted">
            Tarifs Centre National (hébergement et restauration), indépendants du budget voyages /
            compétitions.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Petit déjeuner (MAD)</Label>
              <Input
                type="text"
                inputMode="decimal"
                step="0.01"
                value={tarifsBudget.prix_petit_dejeuner_mad}
                onChange={(e) =>
                  setTarifsBudget({
                    ...tarifsBudget,
                    prix_petit_dejeuner_mad: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label>Déjeuner (MAD)</Label>
              <Input
                type="text"
                inputMode="decimal"
                step="0.01"
                value={tarifsBudget.prix_dejeuner_mad}
                onChange={(e) =>
                  setTarifsBudget({ ...tarifsBudget, prix_dejeuner_mad: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Dîner (MAD)</Label>
              <Input
                type="text"
                inputMode="decimal"
                step="0.01"
                value={tarifsBudget.prix_diner_mad}
                onChange={(e) =>
                  setTarifsBudget({ ...tarifsBudget, prix_diner_mad: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Chambre single / nuit (MAD)</Label>
              <Input
                type="text"
                inputMode="decimal"
                step="0.01"
                value={tarifsBudget.prix_chambre_single_mad}
                onChange={(e) =>
                  setTarifsBudget({
                    ...tarifsBudget,
                    prix_chambre_single_mad: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label>Chambre double / nuit (MAD)</Label>
              <Input
                type="text"
                inputMode="decimal"
                step="0.01"
                value={tarifsBudget.prix_chambre_double_mad}
                onChange={(e) =>
                  setTarifsBudget({
                    ...tarifsBudget,
                    prix_chambre_double_mad: Number(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <Button type="button" onClick={handleSaveBudget}>
            {saved ? "Enregistré ✓" : "Enregistrer les tarifs budget"}
          </Button>
        </Card>
      </main>
    </>
  );
}

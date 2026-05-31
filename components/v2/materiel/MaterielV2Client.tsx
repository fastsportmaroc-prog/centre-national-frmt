"use client";

import { useCallback, useEffect, useState } from "react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { V2PageActions } from "@/components/v2/V2PageActions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { deleteMateriel, getMateriels } from "@/lib/supabase/queries";
import { exportListePdf } from "@/lib/pdf/frmt-pdf";
import { Trash2 } from "lucide-react";

export function MaterielV2Client() {
  const [items, setItems] = useState<{ id: string; nom: string }[]>([]);

  const load = useCallback(async () => {
    setItems(await getMateriels());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string, nom: string) {
    if (!confirm(`Supprimer le matériel « ${nom} » ?`)) return;
    await deleteMateriel(id);
    await load();
  }

  return (
    <>
      <V2PageHeader
        title="Matériel"
        actions={
          <V2PageActions
            onExportPdf={() =>
              exportListePdf("Matériel", ["Nom"], items.map((m) => [m.nom]), "materiel-frmt.pdf")
            }
          />
        }
      />
      <main className="space-y-2 p-4 sm:p-6">
        {items.map((m) => (
          <Card key={m.id} className="flex justify-between p-3">
            <span>{m.nom}</span>
            <Button variant="danger" size="sm" onClick={() => void handleDelete(m.id, m.nom)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </Card>
        ))}
      </main>
    </>
  );
}

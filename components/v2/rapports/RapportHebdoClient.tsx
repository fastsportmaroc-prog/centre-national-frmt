"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getHebergements, getOccupationPourcentage, getRestaurations, getStages } from "@/lib/supabase/queries";
import { exportListePdf } from "@/lib/pdf/pdf-exports";

export function RapportHebdoClient() {
  const [stages, setStages] = useState<Awaited<ReturnType<typeof getStages>>>([]);
  const [occupation, setOccupation] = useState<Awaited<ReturnType<typeof getOccupationPourcentage>>>([]);
  const [hebergements, setHebergements] = useState<Awaited<ReturnType<typeof getHebergements>>>([]);
  const [restaurations, setRestaurations] = useState<Awaited<ReturnType<typeof getRestaurations>>>([]);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  useEffect(() => {
    (async () => {
      const [s, o, h, r] = await Promise.all([
        getStages(),
        getOccupationPourcentage(),
        getHebergements(),
        getRestaurations(),
      ]);
      setStages(s);
      setOccupation(o);
      setHebergements(h);
      setRestaurations(r);
    })();
  }, []);

  const inRange = useMemo(
    () =>
      stages.filter((s) => !(s.date_fin < format(weekStart, "yyyy-MM-dd") || s.date_debut > format(weekEnd, "yyyy-MM-dd"))),
    [stages, weekStart, weekEnd]
  );

  const repas = restaurations.reduce((sum, r) => sum + (r.total_repas ?? 0), 0);

  function exportPdf() {
    exportListePdf(
      `Rapport hebdomadaire ${format(weekStart, "dd/MM")} - ${format(weekEnd, "dd/MM")}`,
      ["Section", "Valeur"],
      [
        ["Stages en cours", String(inRange.length)],
        ["Chambres occupées", String(hebergements.length)],
        ["Repas servis", String(repas)],
        ["Occupation moyenne courts", `${Math.round(occupation.reduce((s, o) => s + o.pct, 0) / Math.max(1, occupation.length))}%`],
      ],
      "rapport-hebdo.pdf"
    );
  }

  return (
    <>
      <V2PageHeader
        title="Rapport hebdomadaire d'activité"
        description={`Semaine du ${format(weekStart, "dd/MM/yyyy")} au ${format(weekEnd, "dd/MM/yyyy")}`}
        actions={<Button onClick={exportPdf}>📄 PDF</Button>}
      />
      <main className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Stages en cours</p>
          <p className="mt-2 text-2xl font-bold">{inRange.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Restauration</p>
          <p className="mt-2 text-2xl font-bold">{repas}</p>
          <p className="text-sm text-[var(--text-secondary)]">repas servis</p>
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Stages actifs</h3>
          {inRange.map((s) => (
            <p key={s.id} className="text-sm">
              • {s.stage_action}
            </p>
          ))}
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 font-semibold">Actions requises</h3>
          <p className="text-sm">□ Confirmer hébergement stage à venir</p>
          <p className="text-sm">□ Vérifier documents joueurs expirants</p>
          <p className="text-sm">□ Factures en attente de paiement</p>
        </Card>
      </main>
    </>
  );
}


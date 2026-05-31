"use client";

import { useEffect, useMemo, useState } from "react";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/v2/ui/EmptyState";
import { getJoueurs } from "@/lib/supabase/queries";
import { exportListePdf } from "@/lib/pdf/pdf-exports";
import type { JoueurV2 } from "@/lib/types/v2";
import { FileCheck } from "lucide-react";

function statusByDate(date?: string | null) {
  if (!date) return "❌";
  const d = new Date(`${date}T00:00:00`);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / 86400000;
  if (diff < 0) return "❌";
  if (diff <= 90) return "⚠️";
  return "✅";
}

export function DocumentsClient() {
  const [joueurs, setJoueurs] = useState<JoueurV2[]>([]);

  useEffect(() => {
    void getJoueurs().then(setJoueurs);
  }, []);

  const rows = useMemo(
    () =>
      joueurs.map((j) => ({
        nom: `${j.prenom} ${j.nom}`,
        licence: j.licence ? "✅ Valide" : "❌ Manquante",
        passport: `${statusByDate(j.passeport_expiration)} ${j.passeport_expiration ?? "N/A"}`,
        assurance: "✅ Valide",
        medical: "✅ Apte",
      })),
    [joueurs]
  );

  const kpi = useMemo(() => {
    const missingLicence = rows.filter((r) => r.licence.includes("❌")).length;
    const passportAlert = rows.filter((r) => r.passport.startsWith("⚠️") || r.passport.startsWith("❌")).length;
    return { total: rows.length, missingLicence, passportAlert };
  }, [rows]);

  return (
    <>
      <V2PageHeader
        title="Convocations & Documents"
        description="Suivi administratif joueurs"
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              exportListePdf(
                "Export documents joueurs",
                ["Joueur", "Licence", "Passport", "Assurance", "Médical"],
                rows.map((r) => [r.nom, r.licence, r.passport, r.assurance, r.medical]),
                "documents-joueurs.pdf"
              )
            }
          >
            📄 Export liste documents
          </Button>
        }
      />
      <main className="p-4 sm:p-6">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Card className="v2-kpi-card p-3">
            <p className="text-xs text-[var(--text-secondary)]">Joueurs suivis</p>
            <p className="text-2xl font-bold">{kpi.total}</p>
          </Card>
          <Card className="v2-kpi-card p-3">
            <p className="text-xs text-[var(--text-secondary)]">Licences manquantes</p>
            <p className="text-2xl font-bold text-red-400">{kpi.missingLicence}</p>
          </Card>
          <Card className="v2-kpi-card p-3">
            <p className="text-xs text-[var(--text-secondary)]">Alertes passeport</p>
            <p className="text-2xl font-bold text-amber-300">{kpi.passportAlert}</p>
          </Card>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={FileCheck}
            title="Aucun document joueur"
            description="Ajoutez des joueurs pour afficher le suivi administratif."
          />
        ) : (
        <Card className="overflow-x-auto p-0">
          <table className="v2-data-table w-full text-sm">
            <thead>
              <tr>
                <th className="p-3 text-left">Joueur</th>
                <th className="p-3 text-left">Licence</th>
                <th className="p-3 text-left">Passport</th>
                <th className="p-3 text-left">Assurance</th>
                <th className="p-3 text-left">Médical</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.nom}>
                  <td className="p-3">{r.nom}</td>
                  <td className="p-3">{r.licence}</td>
                  <td className="p-3">{r.passport}</td>
                  <td className="p-3">{r.assurance}</td>
                  <td className="p-3">{r.medical}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        )}
      </main>
    </>
  );
}


"use client";

import Link from "next/link";
import { Eye, FileDown, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/v2/ui/StatusBadge";
import { RAPPORT_TYPE_LABELS } from "@/lib/rapports/types";
import { formatPeriodeLabel, type StoredReportV2 } from "@/lib/v2/reports-storage";

type Props = {
  reports: StoredReportV2[];
  onDelete: (id: string) => void;
  onExport: (report: StoredReportV2) => void;
  exporting?: boolean;
};

export function RapportTable({ reports, onDelete, onExport, exporting }: Props) {
  if (reports.length === 0) {
    return (
      <Card className="border-[#2a2d3a] bg-[#1a1d27] p-8 text-center text-sm text-muted">
        <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
        Aucun rapport pour ces filtres.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-[#2a2d3a] bg-[#1a1d27] p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#2a2d3a] bg-[#0f1117] text-xs uppercase text-muted">
              <th className="p-3">Titre</th>
              <th className="p-3">Période</th>
              <th className="p-3">Type</th>
              <th className="p-3">Généré le</th>
              <th className="p-3">Statut</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b border-[#2a2d3a]/50 hover:bg-[#0f1117]/50">
                <td className="p-3 font-medium">{r.titre}</td>
                <td className="p-3 text-muted">{formatPeriodeLabel(r.periode)}</td>
                <td className="p-3">
                  <span className="rounded bg-frmt-green/15 px-2 py-0.5 text-xs text-frmt-green">
                    {RAPPORT_TYPE_LABELS[r.type]}
                  </span>
                </td>
                <td className="p-3 text-muted">
                  {new Date(r.generated_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="p-3">
                  <StatusBadge statut={r.statut} />
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Link href={`/v2/rapports/${r.id}`}>
                      <Button variant="secondary" size="sm" title="Voir le détail">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      title="Exporter PDF"
                      disabled={exporting}
                      onClick={() => onExport(r)}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => onDelete(r.id)} title="Supprimer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

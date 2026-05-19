"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getImportHistory, logImportHistory } from "@/lib/data/import-history";
import { addSystemLog } from "@/lib/data/system-logs";
import type { ImportHistoryEntry } from "@/lib/types/system";
import { formatDate } from "@/lib/utils/dates";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCneImportMeta } from "@/lib/excel/cne-loader";
import { importStagesFromCneJson } from "@/lib/data/stages";
import { importOccupationFromCneJson } from "@/lib/data/occupation-cne";
import { FileSpreadsheet, Upload } from "lucide-react";

export function ImportCneClient() {
  const meta = getCneImportMeta();
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);

  useEffect(() => {
    getImportHistory().then(setHistory);
  }, []);

  async function runJsonImport() {
    setLoading(true);
    setStatus(null);
    const errors: string[] = [];
    try {
      const stages = await importStagesFromCneJson();
      const occ = await importOccupationFromCneJson();
      await logImportHistory({
        source: "json",
        filename: "data/cne/*.json",
        stages_imported: stages,
        occupation_imported: occ,
        errors,
        status: "success",
        created_by: user?.fullName ?? user?.email ?? null,
      });
      await addSystemLog({
        level: "info",
        module: "import",
        message: `Import CNE JSON : ${stages} stages, ${occ} occupation`,
        details: null,
      });
      setStatus(`Import terminé : ${stages} stages et ${occ} lignes d'occupation ajoutés depuis data/cne/*.json`);
      setHistory(await getImportHistory());
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur import";
      errors.push(msg);
      await logImportHistory({
        source: "json",
        filename: "data/cne/*.json",
        stages_imported: 0,
        occupation_imported: 0,
        errors,
        status: "failed",
        created_by: user?.fullName ?? null,
      });
      setStatus(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Import Excel CNE"
        description="Calendrier CNE V3 FINALE · Gestion Occupation CNE"
      />
      <main className="flex-1 space-y-6 p-4 sm:p-6 max-w-3xl">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-10 w-10 text-frmt-red" />
            <div>
              <h2 className="font-semibold">Fichiers attendus</h2>
              <p className="text-sm text-muted">
                Placez les fichiers dans <code className="text-foreground">data/excel/</code>
              </p>
            </div>
          </div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Calendrier CNE V3 FINALE.xlsx</li>
            <li>Gestion Occupation CNE.xlsx</li>
          </ul>
          <p className="text-sm text-muted">
            En ligne de commande : <code className="text-foreground">npm run import:excel</code>
            <br />
            Génère <code className="text-foreground">data/cne/calendrier-stages.json</code> et{" "}
            <code className="text-foreground">occupation.json</code>
          </p>
          <Button onClick={runJsonImport} disabled={loading}>
            <Upload className="h-4 w-4" />
            {loading ? "Import…" : "Charger les JSON CNE dans l'application"}
          </Button>
          {status && <p className="text-sm text-frmt-green">{status}</p>}
        </Card>

        <Card premium className="p-6">
          <h3 className="font-semibold mb-3">Historique des imports</h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted">Aucun import enregistré.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.id} className="rounded border border-border px-3 py-2">
                  <span className="font-medium">{formatDate(h.created_at.split("T")[0]!)}</span>
                  {" · "}
                  {h.stages_imported} stages, {h.occupation_imported} occupation —{" "}
                  <span className={h.status === "success" ? "text-frmt-green" : "text-frmt-red"}>
                    {h.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-3">Schéma détecté (meta)</h3>
          <pre className="text-xs overflow-auto max-h-96 rounded-lg bg-surface-elevated p-3">
            {JSON.stringify(meta, null, 2)}
          </pre>
        </Card>
      </main>
    </>
  );
}

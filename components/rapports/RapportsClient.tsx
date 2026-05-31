"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { exportCsv, exportPdfReport } from "@/lib/export/reports";
import { logHistorique } from "@/lib/audit/historique";
import { getAllStagesForSelect } from "@/lib/data/dashboard-stages";
import {
  buildRapportAnnuelMeta,
  buildRapportMensuelMeta,
  buildRapportStagePdfMeta,
  getAnalyseOccupationData,
  getRapportStageDetail,
  getSyntheseParticipants,
  type AnalyseOccupationData,
  type RapportStageDetail,
  type SyntheseParticipants,
} from "@/lib/data/rapports-analyses";
import { occupationBarColor } from "@/lib/data/centre-occupation";
import type { StageProgramme } from "@/lib/types/stages";
import { formatDate } from "@/lib/utils/dates";
import { statutStageLabel } from "@/lib/utils/stage-automation";
import {
  reportBilletsAvion,
  reportDemandesLogistique,
  reportListeJoueurs,
  reportOccupationCourts,
  reportReservationsCourts,
} from "@/lib/reports/generators";
import { FileDown, FileSpreadsheet, ChevronDown, ChevronUp } from "lucide-react";

type TabId = "stage" | "occupation" | "participants" | "export";

const TABS: { id: TabId; label: string }[] = [
  { id: "stage", label: "Rapport par stage" },
  { id: "occupation", label: "Analyse occupation" },
  { id: "participants", label: "Synthèse participants" },
  { id: "export", label: "Export global" },
];

type ReportKey = "joueurs" | "reservations" | "courts" | "logistique" | "billets";

const LEGACY_REPORTS: {
  key: ReportKey;
  label: string;
  filename: string;
  load: () => ReturnType<typeof reportListeJoueurs>;
}[] = [
  { key: "joueurs", label: "Liste des joueurs", filename: "joueurs", load: reportListeJoueurs },
  { key: "reservations", label: "Réservations par court", filename: "reservations-courts", load: reportReservationsCourts },
  { key: "courts", label: "Occupation des courts", filename: "occupation-courts", load: reportOccupationCourts },
  { key: "logistique", label: "Demandes logistiques", filename: "demandes-logistique", load: reportDemandesLogistique },
  { key: "billets", label: "Billets d'avion", filename: "billets-avion", load: reportBilletsAvion },
];

export function RapportsClient() {
  const [tab, setTab] = useState<TabId>("stage");
  const [stages, setStages] = useState<StageProgramme[]>([]);
  const [stageId, setStageId] = useState("");
  const [detail, setDetail] = useState<RapportStageDetail | null>(null);
  const [analyse, setAnalyse] = useState<AnalyseOccupationData | null>(null);
  const [synthese, setSynthese] = useState<SyntheseParticipants | null>(null);
  const [loading, setLoading] = useState(false);
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [legacyLoading, setLegacyLoading] = useState<ReportKey | null>(null);

  useEffect(() => {
    getAllStagesForSelect().then((s) => {
      setStages(s);
      if (s[0]) setStageId(s[0].id);
    });
    getAnalyseOccupationData().then(setAnalyse);
    getSyntheseParticipants().then(setSynthese);
  }, []);

  useEffect(() => {
    if (!stageId) {
      setDetail(null);
      return;
    }
    getRapportStageDetail(stageId).then(setDetail);
  }, [stageId]);

  async function exportStagePdf() {
    if (!detail) return;
    setLoading(true);
    try {
      const meta = buildRapportStagePdfMeta(detail);
      await exportPdfReport(`rapport-stage-${detail.stage.id}.pdf`, meta);
      await logHistorique({
        action: "export",
        module: "rapports",
        entite_id: detail.stage.id,
        entite_label: detail.stage.stage_action,
        ancienne_valeur: null,
        nouvelle_valeur: "PDF stage",
        commentaire: null,
      });
    } finally {
      setLoading(false);
    }
  }

  async function exportGlobal(kind: "mensuel" | "annuel") {
    setLoading(true);
    try {
      const meta = kind === "mensuel" ? await buildRapportMensuelMeta() : await buildRapportAnnuelMeta();
      await exportPdfReport(`rapport-${kind}-stages.pdf`, meta);
      await logHistorique({
        action: "export",
        module: "rapports",
        entite_id: null,
        entite_label: kind === "mensuel" ? "Rapport mensuel" : "Rapport annuel",
        ancienne_valeur: null,
        nouvelle_valeur: "PDF",
        commentaire: null,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleLegacyPdf(key: ReportKey) {
    setLegacyLoading(key);
    try {
      const r = LEGACY_REPORTS.find((x) => x.key === key)!;
      const meta = await r.load();
      await exportPdfReport(`${r.filename}.pdf`, meta);
    } finally {
      setLegacyLoading(null);
    }
  }

  async function handleLegacyCsv(key: ReportKey) {
    setLegacyLoading(key);
    try {
      const r = LEGACY_REPORTS.find((x) => x.key === key)!;
      const meta = await r.load();
      exportCsv(`${r.filename}.csv`, meta.colonnes, meta.lignes);
    } finally {
      setLegacyLoading(null);
    }
  }

  const maxStagesMois = analyse?.stagesParMois.reduce((m, x) => Math.max(m, x.count), 1) ?? 1;

  return (
    <>
      <PageHeader
        title="Rapports"
        description="Analyses stages, occupation et exports PDF"
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          {TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "primary" : "secondary"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {tab === "stage" && (
          <Card className="premium p-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px] flex-1">
                <label className="text-xs text-muted block mb-1">Stage</label>
                <Select value={stageId} onChange={(e) => setStageId(e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.stage_action} — {formatDate(s.date_debut)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button disabled={!detail || loading} onClick={() => exportStagePdf()}>
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
            {!detail ? (
              <p className="text-sm text-muted">Sélectionnez un stage pour afficher le détail.</p>
            ) : (
              <StageDetailView detail={detail} />
            )}
          </Card>
        )}

        {tab === "occupation" && analyse && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="premium p-4">
              <h3 className="font-semibold mb-3">Occupation par installation (mois)</h3>
              <div className="space-y-2">
                {analyse.parInstallation30j.length === 0 ? (
                  <p className="text-sm text-muted">Aucune donnée.</p>
                ) : (
                  analyse.parInstallation30j.map((x) => (
                    <div key={x.nom}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span>{x.nom}</span>
                        <span className="text-muted">{x.pct}%</span>
                      </div>
                      <OccupationBar pct={x.pct} />
                    </div>
                  ))
                )}
              </div>
            </Card>
            <Card className="premium p-4">
              <h3 className="font-semibold mb-3">Stages par mois (6 derniers mois)</h3>
              <div className="flex items-end gap-2 h-32">
                {analyse.stagesParMois.map((m) => (
                  <div key={m.mois} className="flex-1 flex flex-col items-center gap-1">
                    <MonthBar count={m.count} max={maxStagesMois} />
                    <span className="text-[10px] text-muted">{m.mois}</span>
                    <span className="text-xs font-medium">{m.count}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="premium p-4">
              <h3 className="font-semibold mb-3">Top 3 installations</h3>
              {analyse.top3.length === 0 ? (
                <p className="text-sm text-muted">—</p>
              ) : (
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {analyse.top3.map((t) => (
                    <li key={t.nom}>
                      {t.nom} — {t.pct}%
                    </li>
                  ))}
                </ol>
              )}
            </Card>
            <Card className="premium p-4">
              <h3 className="font-semibold mb-3">Périodes creuses (&lt; 20 %)</h3>
              {analyse.periodesCreuses.length === 0 ? (
                <p className="text-sm text-muted">Aucune période creuse détectée.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {analyse.periodesCreuses.map((p) => (
                    <li key={p.semaine}>
                      {p.semaine} — {p.pct}%
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}

        {tab === "participants" && synthese && (
          <Card className="premium p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted">Joueurs uniques</p>
                <p className="text-2xl font-bold text-frmt-green">{synthese.totalJoueursUniques}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Moyenne joueurs / stage</p>
                <p className="text-2xl font-bold text-frmt-green">{synthese.moyenneJoueursParStage}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Total jours entraînement</p>
                <p className="text-2xl font-bold text-frmt-green">{synthese.totalJoursEntrainement}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Par catégorie</h3>
              {synthese.parCategorie.length === 0 ? (
                <p className="text-sm text-muted">Aucun stage enregistré.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="py-2">Catégorie</th>
                      <th className="py-2">Stages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {synthese.parCategorie.map((c) => (
                      <tr key={c.categorie} className="border-b border-border/50">
                        <td className="py-2">{c.categorie}</td>
                        <td className="py-2">{c.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        )}

        {tab === "export" && (
          <Card className="premium p-4 space-y-3">
            <p className="text-sm text-muted">Exports PDF agrégés à partir des stages enregistrés.</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={loading} onClick={() => exportGlobal("mensuel")}>
                <FileDown className="h-4 w-4" />
                Rapport mensuel PDF
              </Button>
              <Button disabled={loading} variant="secondary" onClick={() => exportGlobal("annuel")}>
                <FileDown className="h-4 w-4" />
                Rapport annuel PDF
              </Button>
            </div>
          </Card>
        )}

        <Card className="premium p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left font-semibold"
            onClick={() => setLegacyOpen((o) => !o)}
          >
            Exports legacy (joueurs, courts, logistique…)
            {legacyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {legacyOpen && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {LEGACY_REPORTS.map((r) => (
                <div key={r.key} className="rounded-lg border border-border/60 p-3">
                  <p className="font-medium text-sm">{r.label}</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      disabled={legacyLoading === r.key}
                      onClick={() => handleLegacyPdf(r.key)}
                    >
                      <FileDown className="h-4 w-4" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={legacyLoading === r.key}
                      onClick={() => handleLegacyCsv(r.key)}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </>
  );
}

function StageDetailView({ detail }: { detail: RapportStageDetail }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 text-sm">
      <div>
        <h3 className="font-semibold">{detail.stage.stage_action}</h3>
        <p className="text-muted mt-1">
          {formatDate(detail.stage.date_debut)} → {formatDate(detail.stage.date_fin)} ·{" "}
          {detail.stage.categorie} · {statutStageLabel(detail.stage.statut)}
        </p>
        {detail.stage.lieu && <p className="mt-1">Lieu : {detail.stage.lieu}</p>}
      </div>
      <div>
        <p className="font-medium">Joueurs ({detail.joueurs.length})</p>
        <p className="text-muted">{detail.joueurs.join(", ") || "—"}</p>
        <p className="font-medium mt-2">Coachs ({detail.coachs.length})</p>
        <p className="text-muted">{detail.coachs.join(", ") || "—"}</p>
      </div>
      {detail.hebergement && (
        <div>
          <p className="font-medium">Hébergement</p>
          <p className="text-muted">
            {detail.hebergement.chambres_joueurs} ch. joueurs · {detail.hebergement.chambres_staff} ch. staff ·{" "}
            {detail.hebergement.nuitees} nuitées
            {detail.hebergement.kitchenette ? " · kitchenette" : ""}
          </p>
        </div>
      )}
      {detail.restauration && (
        <div>
          <p className="font-medium">Restauration</p>
          <p className="text-muted">
            PDJ {detail.restauration.petits_dejeuners} · Déj. {detail.restauration.dejeuners} · Dîners{" "}
            {detail.restauration.diners} · Total {detail.restauration.total}
          </p>
        </div>
      )}
      {detail.terrains && (
        <div>
          <p className="font-medium">Terrains</p>
          <p className="text-muted">
            {detail.terrains.count} créneau(x) · {detail.terrains.surface} · {detail.terrains.creneau}
          </p>
          <p className="text-muted">{detail.terrains.labels.join(", ") || "—"}</p>
        </div>
      )}
      {detail.budget_estime != null && (
        <div>
          <p className="font-medium">Budget estimé</p>
          <p className="text-frmt-green font-semibold">
            {detail.budget_estime.toLocaleString("fr-FR")} MAD
          </p>
        </div>
      )}
    </div>
  );
}

function OccupationBar({ pct }: { pct: number }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div
        className={`h-full rounded-full ${occupationBarColor(pct)}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MonthBar({ count, max }: { count: number; max: number }) {
  const h = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div
      className="w-full rounded-t bg-frmt-green/80 min-h-[4px]"
      style={{ height: `${Math.max(4, h)}%` }}
    />
  );
}

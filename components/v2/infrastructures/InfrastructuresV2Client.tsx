"use client";

import { useEffect, useState } from "react";
import { getTerrains, getOccupation, getCalendrierPeriode } from "@/services/terrainService";
import { exportPdfReport, openPrintReport, type ReportMeta } from "@/lib/export/reports";

const COULEUR_TAUX = (pct: number) =>
  pct >= 80 ? "#c8102e" : pct >= 50 ? "#8B6914" : "#1a5c2a";

const COULEUR_CRENEAU: Record<string, string> = {
  matin: "#2196F3",
  "apres-midi": "#FF9800",
  journee: "#9C27B0",
};
const LIBELLE_CRENEAU: Record<string, string> = {
  matin: "Matin (09:00-13:00)",
  "apres-midi": "Après-midi (14:00-18:00)",
  journee: "Journée (09:00-18:00)",
};

const ICONE_TYPE: Record<string, string> = {
  "court-tennis": "🎾",
  "salle-fitness": "🏋️",
  piscine: "🏊",
  gymnase: "🏃",
};

export function InfrastructuresV2Client() {
  const toYmd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const startOfWeek = (d: Date) => {
    const out = new Date(d);
    const day = out.getDay(); // 0=dimanche
    const delta = day === 0 ? -6 : 1 - day;
    out.setDate(out.getDate() + delta);
    return out;
  };
  const endOfWeek = (d: Date) => {
    const s = startOfWeek(d);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    return e;
  };
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);
  const endOfYear = (d: Date) => new Date(d.getFullYear(), 11, 31);
  const [periodeType, setPeriodeType] = useState<"jour" | "semaine" | "mois" | "annee">("mois");
  const [datePivot, setDatePivot] = useState<string>(() => toYmd(new Date()));
  const [onglet, setOnglet] = useState<"occupation" | "calendrier" | "dispatch">("occupation");
  const [occupation, setOccupation] = useState<any[]>([]);
  const [calendrier, setCalendrier] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [terrainFiltre, setTerrainFiltre] = useState<string>("tous");
  const [terrains, setTerrains] = useState<any[]>([]);

  const getPeriode = () => {
    const pivot = new Date(`${datePivot}T12:00:00`);
    if (periodeType === "jour") return { debut: toYmd(pivot), fin: toYmd(pivot) };
    if (periodeType === "semaine") return { debut: toYmd(startOfWeek(pivot)), fin: toYmd(endOfWeek(pivot)) };
    if (periodeType === "annee") return { debut: toYmd(startOfYear(pivot)), fin: toYmd(endOfYear(pivot)) };
    return { debut: toYmd(startOfMonth(pivot)), fin: toYmd(endOfMonth(pivot)) };
  };
  const formatFr = (ymd: string) =>
    new Date(`${ymd}T12:00:00`).toLocaleDateString("fr-MA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErrorMessage(null);
    void Promise.allSettled([
      getOccupation(),
      getTerrains(),
      (() => {
        const p = getPeriode();
        return getCalendrierPeriode(p.debut, p.fin);
      })(),
    ])
      .then(([occ, ter, cal]) => {
        if (!mounted) return;
        if (occ.status === "fulfilled") setOccupation(occ.value ?? []);
        else setOccupation([]);
        if (ter.status === "fulfilled") setTerrains(ter.value ?? []);
        else setTerrains([]);
        if (cal.status === "fulfilled") setCalendrier(cal.value ?? []);
        else setCalendrier([]);

        const errors = [occ, ter, cal]
          .filter((x): x is PromiseRejectedResult => x.status === "rejected")
          .map((x) => {
            const reason = x.reason as any;
            if (reason instanceof Error) return reason.message;
            if (typeof reason === "string") return reason;
            if (reason?.message) return String(reason.message);
            return JSON.stringify(reason);
          });
        const filteredErrors = errors.filter(
          (e) => !e.toLowerCase().includes("column reservations_infrastructure.creneau does not exist")
        );
        if (filteredErrors.length > 0) {
          setErrorMessage(filteredErrors.join(" | "));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [datePivot, periodeType]);

  const shiftPeriode = (direction: -1 | 1) => {
    const pivot = new Date(`${datePivot}T12:00:00`);
    if (periodeType === "jour") pivot.setDate(pivot.getDate() + direction);
    else if (periodeType === "semaine") pivot.setDate(pivot.getDate() + 7 * direction);
    else if (periodeType === "annee") pivot.setFullYear(pivot.getFullYear() + direction);
    else pivot.setMonth(pivot.getMonth() + direction);
    setDatePivot(toYmd(pivot));
  };

  const reservationsFiltrees =
    terrainFiltre === "tous"
      ? calendrier
      : calendrier.filter((r) => r.terrain_id === terrainFiltre);

  const buildOccupationReport = (): ReportMeta => ({
    titre: "Terrains & Infrastructures — Occupation",
    sousTitre: "Synthèse d'occupation",
    filtres: "Fenêtre glissante (occupation)",
    colonnes: [
      "Infrastructure",
      "Type",
      "Surface",
      "Capacité",
      "Matin",
      "Après-midi",
      "Journée",
      "Stages",
      "Taux",
    ],
    lignes: occupation.map((t) => [
      String(t.nom ?? "—"),
      String(t.type ?? "—"),
      String(t.surface ?? "—"),
      String(t.capacite ?? "—"),
      `${t.jours_matin ?? 0}j`,
      `${t.jours_aprem ?? 0}j`,
      `${t.jours_journee ?? 0}j`,
      String(t.nb_stages ?? 0),
      `${t.taux_occupation_pct ?? 0}%`,
    ]),
  });

  const buildCalendrierReport = (): ReportMeta => {
    const p = getPeriode();
    return {
      titre: "Terrains & Infrastructures — Calendrier",
      sousTitre: "Réservations sur la période",
      filtres: `Période: ${formatFr(p.debut)} → ${formatFr(p.fin)}${
        terrainFiltre !== "tous" ? ` | Terrain: ${terrains.find((t) => t.id === terrainFiltre)?.nom ?? terrainFiltre}` : ""
      }`,
      colonnes: ["Terrain", "Stage", "Catégorie", "Date début", "Date fin", "Créneau", "Mode", "Joueurs"],
      lignes: reservationsFiltrees.map((r) => [
        String(r.terrain_nom ?? "—"),
        String(r.stage_nom ?? "—"),
        String(r.stage_categorie ?? "—"),
        String(r.date_debut ?? "—"),
        String(r.date_fin ?? "—"),
        String(r.creneau ?? "—"),
        String(r.mode ?? "stage"),
        String(r.nb_joueurs_dispatches ?? 0),
      ]),
    };
  };

  const buildDispatchReport = (): ReportMeta => {
    const p = getPeriode();
    const dispatchRows = calendrier.filter((r) => {
      const nb = Number(r.nb_joueurs_dispatches ?? 0);
      const mode = String(r.mode ?? "").toLowerCase();
      return nb > 0 || mode === "dispatch";
    });
    return {
      titre: "Terrains & Infrastructures — Dispatch Joueurs",
      sousTitre: "Détail dispatch par réservation",
      filtres: `Période: ${formatFr(p.debut)} → ${formatFr(p.fin)}`,
      colonnes: ["Stage", "Court", "Date", "Créneau", "Plage horaire", "Joueurs concernés", "Nb joueurs"],
      lignes: dispatchRows.map((r) => [
        String(r.stage_nom ?? "—"),
        String(r.terrain_nom ?? "—"),
        String(r.date_debut ?? "—"),
        String(r.creneau ?? "—"),
        String(LIBELLE_CRENEAU[String(r.creneau)] ?? String(r.creneau ?? "—")),
        Array.isArray(r.dispatch_joueurs_noms) && r.dispatch_joueurs_noms.length > 0
          ? r.dispatch_joueurs_noms.join(", ")
          : "—",
        String(r.nb_joueurs_dispatches ?? 0),
      ]),
    };
  };

  const getCurrentReport = (): ReportMeta => {
    if (onglet === "occupation") return buildOccupationReport();
    if (onglet === "dispatch") return buildDispatchReport();
    return buildCalendrierReport();
  };

  const handlePrint = () => {
    void openPrintReport(getCurrentReport());
  };

  const handleExportPdf = () => {
    const suffix =
      onglet === "occupation"
        ? "occupation"
        : onglet === "dispatch"
          ? "dispatch"
          : "calendrier";
    void exportPdfReport(`terrains-infrastructures-${suffix}.pdf`, getCurrentReport());
  };

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: "bold", margin: 0 }}>
            Terrains & Infrastructures
          </h1>
          <p style={{ color: "#888", margin: "4px 0 0" }}>
            CNE Rabat — 3 courts TB · 2 courts Dur · Espace Physique · Natation · Gym
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        {(["jour", "semaine", "mois", "annee"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodeType(p)}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: periodeType === p ? "#1a5c2a" : "#fff",
              color: periodeType === p ? "#fff" : "#111",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {p === "jour" ? "Par jour" : p === "semaine" ? "Par semaine" : p === "mois" ? "Par mois" : "Annuel"}
          </button>
        ))}
        <button
          onClick={() => shiftPeriode(-1)}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            color: "#111",
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          ←
        </button>
        <input
          type="date"
          value={datePivot}
          onChange={(e) => setDatePivot(e.target.value)}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            color: "#111",
            fontSize: 15,
            fontWeight: 600,
            minWidth: 170,
          }}
        />
        <button
          onClick={() => shiftPeriode(1)}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            color: "#111",
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          →
        </button>
      </div>
      <div style={{ marginBottom: 16, color: "#9ca3af", fontSize: 14, fontWeight: 600 }}>
        {(() => {
          const p = getPeriode();
          return `Période active : du ${formatFr(p.debut)} au ${formatFr(p.fin)}`;
        })()}
      </div>

      {loading && (
        <div style={{ marginBottom: 16, color: "#666", fontSize: 13 }}>
          Chargement des terrains et réservations...
        </div>
      )}
      {errorMessage && (
        <div
          style={{
            marginBottom: 16,
            background: "#fff7ed",
            color: "#9a3412",
            border: "1px solid #fed7aa",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 12,
          }}
        >
          Données chargées avec fallback. Détail: {errorMessage}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          borderBottom: "1px solid #e0e0e0",
          paddingBottom: 8,
        }}
      >
        {[
          { id: "occupation", label: "📊 Occupation" },
          { id: "calendrier", label: "📅 Calendrier" },
          { id: "dispatch", label: "👥 Dispatch Joueurs" },
        ].map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id as any)}
            style={{
              padding: "8px 18px",
              borderRadius: 6,
              border: "none",
              fontWeight: onglet === o.id ? "bold" : "normal",
              background: onglet === o.id ? "#1a5c2a" : "#f5f5f5",
              color: onglet === o.id ? "#fff" : "#333",
              cursor: "pointer",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={handlePrint}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            color: "#111",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Imprimer {onglet === "occupation" ? "Occupation" : onglet === "dispatch" ? "Dispatch" : "Calendrier"}
        </button>
        <button
          onClick={handleExportPdf}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            color: "#111",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Export PDF {onglet === "occupation" ? "Occupation" : onglet === "dispatch" ? "Dispatch" : "Calendrier"}
        </button>
      </div>

      {onglet === "occupation" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {occupation.map((t) => (
              <div
                key={t.id}
                style={{
                  background: "#fff",
                  color: "#111",
                  border: "1px solid #e0e0e0",
                  borderTop: `4px solid ${COULEUR_TAUX(t.taux_occupation_pct)}`,
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 4 }}>{ICONE_TYPE[t.type]}</div>
                <div style={{ fontWeight: "bold", fontSize: 14 }}>{t.nom}</div>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>
                  {t.surface} · max {t.capacite} joueurs
                </div>
                <div
                  style={{
                    background: "#f0f0f0",
                    borderRadius: 4,
                    height: 10,
                    overflow: "hidden",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(t.taux_occupation_pct, 100)}%`,
                      background: COULEUR_TAUX(t.taux_occupation_pct),
                      height: "100%",
                      borderRadius: 4,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ fontWeight: "bold", color: COULEUR_TAUX(t.taux_occupation_pct) }}>
                    {t.taux_occupation_pct}% occupé
                  </span>
                  <span style={{ color: "#888" }}>{t.nb_stages} stage(s)</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: "#aaa" }}>
                  ☀️ {t.jours_matin}j matin &nbsp;·&nbsp; 🌤 {t.jours_aprem}j après-midi &nbsp;·&nbsp;
                  🌞 {t.jours_journee}j journée
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ color: "#1a5c2a", borderBottom: "2px solid #c8102e", paddingBottom: 6 }}>
            Récapitulatif global — 30 jours glissants
          </h3>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", color: "#111" }}
          >
            <thead>
              <tr style={{ background: "#1a5c2a", color: "#fff" }}>
                {[
                  "Infrastructure",
                  "Type",
                  "Surface",
                  "Capacité",
                  "Matin",
                  "Après-midi",
                  "Journée",
                  "Stages",
                  "Taux",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 10px",
                      textAlign: "left",
                      border: "0.5px solid #0d3d1a",
                      color: "#fff",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {occupation.map((t, i) => (
                <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#f5faf5", color: "#111" }}>
                  <td style={{ padding: "7px 10px", fontWeight: "bold", border: "0.5px solid #ddd", color: "#111" }}>
                    {ICONE_TYPE[t.type]} {t.nom}
                  </td>
                  <td style={{ padding: "7px 10px", border: "0.5px solid #ddd", color: "#111" }}>{t.type}</td>
                  <td style={{ padding: "7px 10px", border: "0.5px solid #ddd", color: "#111" }}>{t.surface}</td>
                  <td
                    style={{ padding: "7px 10px", textAlign: "center", border: "0.5px solid #ddd", color: "#111" }}
                  >
                    {t.capacite}
                  </td>
                  <td
                    style={{ padding: "7px 10px", textAlign: "center", border: "0.5px solid #ddd", color: "#111" }}
                  >
                    {t.jours_matin}j
                  </td>
                  <td
                    style={{ padding: "7px 10px", textAlign: "center", border: "0.5px solid #ddd", color: "#111" }}
                  >
                    {t.jours_aprem}j
                  </td>
                  <td
                    style={{ padding: "7px 10px", textAlign: "center", border: "0.5px solid #ddd", color: "#111" }}
                  >
                    {t.jours_journee}j
                  </td>
                  <td
                    style={{ padding: "7px 10px", textAlign: "center", border: "0.5px solid #ddd", color: "#111" }}
                  >
                    {t.nb_stages}
                  </td>
                  <td
                    style={{ padding: "7px 10px", textAlign: "center", border: "0.5px solid #ddd", color: "#111" }}
                  >
                    <span style={{ fontWeight: "bold", color: COULEUR_TAUX(t.taux_occupation_pct) }}>
                      {t.taux_occupation_pct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {onglet === "calendrier" && (
        <div>
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <select
              value={terrainFiltre}
              onChange={(e) => setTerrainFiltre(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ddd",
                fontSize: 13,
                background: "#fff",
                color: "#111",
              }}
            >
              <option value="tous">Tous les terrains</option>
              {terrains.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            {Object.entries(COULEUR_CRENEAU).map(([c, col]) => (
              <div key={c} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: col }} />
                <span style={{ fontSize: 12 }}>
                  {c === "matin" ? "Matin" : c === "apres-midi" ? "Après-midi" : "Journée"}
                </span>
              </div>
            ))}
          </div>

          {reservationsFiltrees.length === 0 ? (
            <p style={{ color: "#888", fontStyle: "italic" }}>Aucune réservation sur cette période.</p>
          ) : (
            <table
              style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", color: "#111" }}
            >
              <thead>
                <tr style={{ background: "#1a5c2a", color: "#fff" }}>
                  {["Terrain", "Stage", "Catégorie", "Période", "Créneau", "Mode", "Joueurs"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 10px",
                        border: "0.5px solid #0d3d1a",
                        textAlign: "left",
                        color: "#fff",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservationsFiltrees.map((r, i) => (
                  <tr key={r.reservation_id} style={{ background: i % 2 === 0 ? "#fff" : "#f5faf5", color: "#111" }}>
                    <td
                      style={{
                        padding: "7px 10px",
                        border: "0.5px solid #ddd",
                        fontWeight: "bold",
                        color: "#111",
                      }}
                    >
                      {ICONE_TYPE[r.terrain_type]} {r.terrain_nom}
                    </td>
                    <td style={{ padding: "7px 10px", border: "0.5px solid #ddd", color: "#111" }}>
                      {r.stage_nom}
                    </td>
                    <td style={{ padding: "7px 10px", border: "0.5px solid #ddd", color: "#111" }}>
                      {r.stage_categorie}
                    </td>
                    <td style={{ padding: "7px 10px", border: "0.5px solid #ddd", color: "#111" }}>
                      {new Date(r.date_debut).toLocaleDateString("fr-MA")}
                      {r.date_debut !== r.date_fin &&
                        ` → ${new Date(r.date_fin).toLocaleDateString("fr-MA")}`}
                    </td>
                    <td style={{ padding: "7px 10px", border: "0.5px solid #ddd", color: "#111" }}>
                      <span
                        style={{
                          background: COULEUR_CRENEAU[r.creneau],
                          color: "#fff",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: "bold",
                        }}
                      >
                        {r.creneau}
                      </span>
                    </td>
                    <td style={{ padding: "7px 10px", border: "0.5px solid #ddd", color: "#111" }}>
                      {r.mode === "dispatch" ? "👥 Dispatch" : "📋 Stage entier"}
                    </td>
                    <td
                      style={{ padding: "7px 10px", border: "0.5px solid #ddd", textAlign: "center", color: "#111" }}
                    >
                      {r.nb_joueurs_dispatches > 0 ? `${r.nb_joueurs_dispatches} joueur(s)` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {onglet === "dispatch" && (
        <div>
          <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>
            Vue du dispatch des joueurs par terrain et par stage.
          </p>
          {(() => {
            const dispatchRows = calendrier.filter((r) => {
              const nb = Number(r.nb_joueurs_dispatches ?? 0);
              const mode = String(r.mode ?? "").toLowerCase();
              return nb > 0 || mode === "dispatch";
            });
            const groups = new Map<string, any[]>();
            for (const row of dispatchRows) {
              const key = `${row.terrain_id ?? ""}::${row.terrain_nom ?? "Terrain"}`;
              const list = groups.get(key) ?? [];
              list.push(row);
              groups.set(key, list);
            }
            if (groups.size === 0) {
              return (
                <p style={{ color: "#888", fontStyle: "italic" }}>
                  Aucun dispatch détecté sur la période affichée.
                </p>
              );
            }
            return [...groups.entries()].map(([key, resas]) => {
              const first = resas[0];
              const terrainType = String(first?.terrain_type ?? "");
              const terrainNom = String(first?.terrain_nom ?? "Terrain");
              return (
                <div key={key} style={{ marginBottom: 24 }}>
                  <h3
                    style={{
                      color: "#1a5c2a",
                      borderBottom: "1px solid #e0e0e0",
                      paddingBottom: 6,
                    }}
                  >
                    {ICONE_TYPE[terrainType] ?? "📍"} {terrainNom}
                  </h3>
                  {resas.map((r) => (
                    <div
                      key={r.reservation_id}
                      style={{
                        background: "#f9f9f9",
                        color: "#111",
                        border: "1px solid #e0e0e0",
                        borderRadius: 6,
                        padding: 12,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ fontWeight: "bold", fontSize: 13 }}>
                        {r.stage_nom} —
                        <span
                          style={{
                            background: COULEUR_CRENEAU[r.creneau],
                            color: "#fff",
                            padding: "1px 6px",
                            borderRadius: 3,
                            fontSize: 11,
                            marginLeft: 6,
                          }}
                        >
                          {r.creneau}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        Date: {new Date(r.date_debut).toLocaleDateString("fr-MA")}
                        {r.date_fin && r.date_fin !== r.date_debut
                          ? ` → ${new Date(r.date_fin).toLocaleDateString("fr-MA")}`
                          : ""}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        Court: {r.terrain_nom ?? "—"}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        Plage horaire: {LIBELLE_CRENEAU[String(r.creneau)] ?? String(r.creneau ?? "—")}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                        Joueurs:{" "}
                        {Array.isArray(r.dispatch_joueurs_noms) && r.dispatch_joueurs_noms.length > 0
                          ? r.dispatch_joueurs_noms.join(", ")
                          : `${Number(r.nb_joueurs_dispatches ?? 0)} joueur(s) affecté(s)`}
                      </div>
                    </div>
                  ))}
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

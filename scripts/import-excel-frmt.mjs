#!/usr/bin/env node
/**
 * Analyse les fichiers Excel FRMT et génère data/cne/*.json + import-meta.json
 * Fichiers attendus dans data/excel/ :
 *   - Calendrier CNE V3 FINALE.xlsx
 *   - Gestion Occupation CNE.xlsx
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const EXCEL_DIR = path.join(ROOT, "data", "excel");
const OUT_DIR = path.join(ROOT, "data", "cne");

const CALENDRIER_NAMES = ["Calendrier CNE V3 FINALE.xlsx", "calendrier cne v3 finale.xlsx"];
const OCCUPATION_NAMES = ["Gestion Occupation CNE.xlsx", "gestion occupation cne.xlsx"];

const STAGE_MAP = [
  ["id", "id_excel"],
  ["source", "source"],
  ["categorie", "categorie", "catégorie"],
  ["stage", "stage_action", "stage / action", "action"],
  ["debut", "date_debut", "date début", "date debut"],
  ["fin", "date_fin", "date fin"],
  ["joueurs", "nombre_joueurs", "nombre joueurs", "nb joueurs"],
  ["encadrants", "nombre_encadrants", "nombre encadrants"],
  ["hebergement", "hebergement", "hébergement"],
  ["chambres", "chambres"],
  ["lieu", "lieu"],
  ["notes", "notes"],
];

function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function matchKey(header, aliases) {
  const h = norm(header);
  return aliases.some((a) => h.includes(norm(a)));
}

function detectColumns(headers) {
  const cols = {};
  for (const h of headers) {
    if (!h) continue;
    for (const [key, ...aliases] of STAGE_MAP) {
      if (matchKey(h, aliases)) cols[key] = h;
    }
  }
  return cols;
}

function excelDateToIso(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = new Date((v - 25569) * 86400 * 1000);
    return d.toISOString().split("T")[0];
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return s;
}

function sheetToRows(wb, sheetName) {
  const sheet = wb.Sheets[sheetName ?? wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

function findFile(names) {
  if (!fs.existsSync(EXCEL_DIR)) return null;
  const files = fs.readdirSync(EXCEL_DIR);
  for (const n of names) {
    const hit = files.find((f) => norm(f) === norm(n));
    if (hit) return path.join(EXCEL_DIR, hit);
  }
  return null;
}

async function loadXlsx() {
  try {
    return (await import("xlsx")).default;
  } catch {
    console.error("Installez xlsx : npm install -D xlsx");
    process.exit(1);
  }
}

function parseStages(rows, headers) {
  const map = detectColumns(headers);
  return rows
    .filter((r) => Object.values(r).some((v) => v != null && String(v).trim() !== ""))
    .map((r, i) => ({
      id_excel: String(r[map.id] ?? r["ID"] ?? `ROW-${i + 1}`),
      source: String(r[map.source] ?? r["Source"] ?? "FRMT"),
      categorie: String(r[map.categorie] ?? r["Catégorie"] ?? "Seniors"),
      stage_action: String(r[map.stage] ?? r["Stage / Action"] ?? "Stage"),
      date_debut: excelDateToIso(r[map.debut] ?? r["Date début"]) ?? new Date().toISOString().split("T")[0],
      date_fin: excelDateToIso(r[map.fin] ?? r["Date fin"]) ?? new Date().toISOString().split("T")[0],
      nombre_joueurs: Number(r[map.joueurs] ?? 0) || 0,
      nombre_encadrants: Number(r[map.encadrants] ?? 0) || 0,
      hebergement: Boolean(r[map.hebergement] ?? true),
      chambres: Number(r[map.chambres] ?? 0) || 0,
      lieu: r[map.lieu] ? String(r[map.lieu]) : null,
      notes: r[map.notes] ? String(r[map.notes]) : null,
    }));
}

function parseOccupation(rows) {
  return rows
    .filter((r) => Object.values(r).some((v) => v != null && String(v).trim() !== ""))
    .map((r) => {
      const cap = Number(r["Capacité"] ?? r.capacite ?? 1) || 1;
      const occ = Number(r["Occupants"] ?? r.occupants ?? 0) || 0;
      const taux = r["Taux %"] ?? r.taux_occupation_pct ?? (cap ? Math.round((occ / cap) * 100) : 0);
      return {
        date: excelDateToIso(r["Date"] ?? r.date) ?? new Date().toISOString().split("T")[0],
        pavillon: Number(r["Pavillon"] ?? r.pavillon ?? 0) || 0,
        numero_chambre: Number(r["Chambre"] ?? r.numero_chambre ?? 0) || 0,
        type_chambre: String(r["Type"] ?? r.type_chambre ?? "double"),
        capacite: cap,
        occupants: occ,
        stage_id_excel: r["Stage ID"] ? String(r["Stage ID"]) : null,
        stage_libelle: r["Stage"] ? String(r["Stage"]) : null,
        categorie: r["Catégorie"] ? String(r["Catégorie"]) : null,
        taux_occupation_pct: Number(taux) || 0,
        alerte: r["Alerte"] ? String(r["Alerte"]) : occ > cap ? `Surcharge — ${occ}/${cap}` : null,
      };
    });
}

async function main() {
  const XLSX = await loadXlsx();
  globalThis.XLSX = XLSX;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(EXCEL_DIR, { recursive: true });

  const meta = {
    version: 1,
    imported_at: new Date().toISOString(),
    source: "excel-import",
    files: {},
  };

  const calPath = findFile(CALENDRIER_NAMES);
  const occPath = findFile(OCCUPATION_NAMES);

  if (!calPath && !occPath) {
    console.log("Aucun fichier Excel dans data/excel/ — données seed conservées.");
    console.log("Placez les fichiers puis relancez : npm run import:excel");
    process.exit(0);
  }

  if (calPath) {
    const wb = XLSX.readFile(calPath);
    const sheet = wb.SheetNames[0];
    const rows = sheetToRows(wb, sheet);
    const headers = rows.length ? Object.keys(rows[0]) : [];
    const stages = parseStages(rows, headers);
    fs.writeFileSync(
      path.join(OUT_DIR, "calendrier-stages.json"),
      JSON.stringify(stages, null, 2),
      "utf8"
    );
    meta.files.calendrier = {
      filename: path.basename(calPath),
      sheets: [{ name: sheet, columns: headers.map((h) => ({ key: h, header: h })), rowCount: stages.length }],
    };
    console.log(`✓ ${stages.length} stages → data/cne/calendrier-stages.json`);
  }

  if (occPath) {
    const wb = XLSX.readFile(occPath);
    const sheet = wb.SheetNames[0];
    const rows = sheetToRows(wb, sheet);
    const occupation = parseOccupation(rows);
    fs.writeFileSync(
      path.join(OUT_DIR, "occupation.json"),
      JSON.stringify(occupation, null, 2),
      "utf8"
    );
    meta.files.occupation = {
      filename: path.basename(occPath),
      sheets: [{ name: sheet, rowCount: occupation.length }],
    };
    console.log(`✓ ${occupation.length} lignes occupation → data/cne/occupation.json`);
  }

  fs.writeFileSync(path.join(OUT_DIR, "import-meta.json"), JSON.stringify(meta, null, 2), "utf8");
  console.log("✓ import-meta.json mis à jour");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

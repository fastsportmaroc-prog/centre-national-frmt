import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  APP_NAME,
  BRAND_CENTRE,
  BRAND_FRMT,
  FEDERATION_NAME,
  FRMT_GREEN,
  FRMT_RED,
  REPORT_FOOTER,
} from "@/lib/constants/branding";

export type FrmtDocumentMeta = {
  titre: string;
  sousTitre?: string;
  filtres?: string;
  utilisateur?: string;
  colonnes: string[];
  lignes: string[][];
};

const BASE_STYLES = `
  body{font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#111;padding:32px 40px}
  .header{display:flex;align-items:flex-start;gap:20px;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid ${FRMT_GREEN}}
  .logo-slot{width:72px;height:72px;border:2px dashed ${FRMT_GREEN};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#666;text-align:center;line-height:1.2}
  .brand-frmt{font-size:24px;font-weight:900;color:${FRMT_RED};letter-spacing:.06em;margin:0}
  .brand-centre{font-size:12px;font-weight:700;color:${FRMT_GREEN};letter-spacing:.12em;text-transform:uppercase;margin:4px 0 0}
  .fed{font-size:11px;color:#555;margin:6px 0 0}
  h1.doc-title{font-size:18px;margin:16px 0 6px}
  .meta{color:#666;font-size:12px;margin-bottom:20px;line-height:1.5}
  table{border-collapse:collapse;width:100%;font-size:11px}
  th{background:${FRMT_GREEN}!important;color:#fff!important;padding:8px;text-align:left}
  td{border:1px solid #ddd;padding:7px}
  tr:nth-child(even){background:#f8faf9}
  .footer{margin-top:32px;font-size:10px;color:#888;border-top:1px solid #ddd;padding-top:10px}
  @media print{body{padding:16px}}
`;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildFrmtDocumentHtml(meta: FrmtDocumentMeta): string {
  const dateGen = format(new Date(), "dd MMMM yyyy à HH:mm", { locale: fr });
  const user = meta.utilisateur ?? "—";
  const headers = meta.colonnes.map((c) => `<th>${esc(c)}</th>`).join("");
  const rows = meta.lignes
    .map((cells) => `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>${esc(meta.titre)} — ${esc(BRAND_FRMT)}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="header">
    <div class="logo-slot">Logo officiel<br/>à intégrer</div>
    <div>
      <p class="brand-frmt">${esc(BRAND_FRMT)}</p>
      <p class="brand-centre">${esc(BRAND_CENTRE)}</p>
      <p class="fed">${esc(FEDERATION_NAME)} · ${esc(APP_NAME)}</p>
    </div>
  </div>
  <h1 class="doc-title">${esc(meta.titre)}</h1>
  ${meta.sousTitre ? `<p>${esc(meta.sousTitre)}</p>` : ""}
  <p class="meta">
    Généré le ${esc(dateGen)}<br/>
    Utilisateur : ${esc(user)}<br/>
    ${meta.filtres ? `Filtres : ${esc(meta.filtres)}` : ""}
  </p>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${meta.colonnes.length}">Aucune donnée</td></tr>`}</tbody>
  </table>
  <p class="footer">${esc(REPORT_FOOTER)}</p>
</body>
</html>`;
}

export function openPrintWindow(html: string, title: string): void {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    alert("Autorisez les pop-ups pour imprimer ou exporter en PDF.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  w.focus();
  w.print();
}

export function downloadPdfViaPrint(html: string, title: string): void {
  openPrintWindow(html, title);
}

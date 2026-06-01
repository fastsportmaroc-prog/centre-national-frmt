import { getOfficialLogoImgHtml } from "@/lib/brand/print-logo";
import { FEDERATION_NAME, PRINT_FOOTER_LEFT } from "@/lib/constants/branding";
import type { ReportMeta, ReportKpi, ReportTableSection } from "@/lib/export/reports";
import { formatGeneratedDatePrint } from "@/lib/print/format-date";
import { getPrintReportCss } from "@/lib/print/print-report-css";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statutClass(cell: string): string {
  const raw = cell.trim();
  const low = raw.toLowerCase();
  if (low === "oui") return "s-oui";
  if (low === "non") return "s-non";
  const s = low
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
  if (s.includes("annul")) return "s-annule";
  if (s.includes("cours") || s.includes("encours")) return "s-encours";
  if (s.includes("termin") || s.includes("paye") || s.includes("livre") || s.includes("clotur"))
    return "s-termine";
  if (s.includes("prevu") || s.includes("planif") || s.includes("emis")) return "s-prevu";
  return "";
}

function thClass(align?: "left" | "center" | "right"): string {
  if (align === "left") return "tl";
  if (align === "right") return "tr";
  return "";
}

function tdClass(align?: "left" | "center" | "right", bold = false): string {
  const parts: string[] = [];
  if (align === "center") parts.push("tc");
  else if (align === "right") parts.push("tr");
  if (bold) parts.push("bold");
  return parts.join(" ");
}

export function buildPrintHeaderHtml(
  meta: Partial<Pick<ReportMeta, "reference" | "generatedRole" | "generatedBy">> = {}
): string {
  const year = new Date().getFullYear();
  const ref = meta.reference ?? `CNF-${year}`;
  const now = new Date();
  return `
  <header class="ph print-header">
    ${getOfficialLogoImgHtml(80, "report-logo")}
    <div class="ph-org">
      <p class="ph-org-name">${esc(FEDERATION_NAME)}</p>
    </div>
    <div class="ph-meta ph-meta-gen">
      <div>Réf. : ${esc(ref)}</div>
      <div>Généré le ${esc(formatGeneratedDatePrint(now))}</div>
      ${meta.generatedBy ? `<div>${esc(meta.generatedBy)}</div>` : ""}
      ${meta.generatedRole ? `<div><strong>${esc(meta.generatedRole)}</strong></div>` : ""}
    </div>
  </header>`;
}

export function buildPrintTitleBandHtml(titre: string, sousTitre?: string, legacy = false): string {
  return `
  <div class="report-title-block${legacy ? " report-title-block--legacy" : ""}">
    <h1>${esc(titre)}</h1>
    ${sousTitre ? `<p>${esc(sousTitre)}</p>` : ""}
  </div>
  <div class="title-divider"></div>`;
}

export function buildMetaBoxHtml(rows: { label: string; value: string }[][]): string {
  if (!rows.length) return "";
  const body = rows
    .map(
      (tr) =>
        `<tr>${tr.map((pair) => `<td>${esc(pair.label)} :</td><td>${esc(pair.value)}</td>`).join("")}</tr>`
    )
    .join("");
  return `<div class="meta-box"><table><tbody>${body}</tbody></table></div>`;
}

export function buildKpiGridHtml(kpis: ReportKpi[], legacy = false): string {
  if (!kpis.length) return "";
  const cells = kpis
    .slice(0, 4)
    .map(
      (k) => `
    <div class="kpi-box${legacy ? " kpi-box--legacy" : ""}">
      <span class="kpi-label">${esc(k.label)}</span>
      <span class="kpi-value">${esc(k.value)}</span>
      ${k.sub ? `<span class="kpi-sub">${esc(k.sub)}</span>` : ""}
    </div>`
    )
    .join("");
  return `<div class="kpi-row">${cells}</div>`;
}

export function buildReportTableHtml(section: ReportTableSection, legacy = false): string {
  const { title, colonnes, lignes, footer, headerAlign, cellAlign } = section;
  const tableClass = legacy ? "rt rt-legacy" : "rt";
  const head = colonnes
    .map((h, i) => {
      const align = headerAlign?.[i] ?? (i === 0 ? "left" : "center");
      return `<th class="${thClass(align)}">${esc(h)}</th>`;
    })
    .join("");
  const body = lignes
    .map((row) => {
      const cells = row
        .map((cell, i) => {
          const raw = String(cell ?? "—");
          const align: "left" | "center" | "right" =
            cellAlign?.[i] === "left"
              ? "left"
              : cellAlign?.[i] === "right"
                ? "right"
                : cellAlign?.[i] === "center"
                  ? "center"
                  : i === 0
                    ? "left"
                    : "center";
          const sc = statutClass(raw);
          const inner = sc ? `<span class="${sc}">${esc(raw)}</span>` : esc(raw);
          const bold = raw.toUpperCase().includes("TOTAL");
          return `<td class="${tdClass(align, bold)}">${inner}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const foot = footer?.length
    ? `<tfoot>${footer
        .map((row) => {
          const cells = row
            .map((c, i) => {
              const align =
                cellAlign?.[i] === "left"
                  ? "left"
                  : cellAlign?.[i] === "center"
                    ? "center"
                    : i === 0
                      ? "left"
                      : "center";
              return `<td class="${tdClass(align === "left" ? "left" : "center", true)}">${esc(c)}</td>`;
            })
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("")}</tfoot>`
    : "";
  return `
  ${title ? `<h2 class="section-title">${esc(title)}</h2>` : ""}
  <table class="${tableClass}">
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
    ${foot}
  </table>`;
}

export function buildPrintFooterHtml(legacy = false): string {
  return `
  <footer class="print-footer${legacy ? " print-footer--legacy" : ""}">
    <span class="fl">${esc(PRINT_FOOTER_LEFT)}</span>
    <span class="fc">Document officiel — Usage interne</span>
    <span>Page <span class="pnum"></span></span>
  </footer>`;
}

export function buildInstitutionalPrintHtml(meta: ReportMeta, legacy = meta.legacyPrintStyle ?? false): string {
  const mainSection: ReportTableSection = {
    title: meta.mainTableTitle ?? "Détail",
    colonnes: meta.colonnes,
    lignes: meta.lignes,
    footer: meta.footer,
    headerAlign: meta.headerAlign,
    cellAlign: meta.cellAlign,
  };

  const sectionsHtml = [
    meta.colonnes.length && meta.lignes.length ? buildReportTableHtml(mainSection, legacy) : "",
    ...(meta.sections ?? []).map((s) => buildReportTableHtml(s, legacy)),
    meta.recap ? buildReportTableHtml(meta.recap, legacy) : "",
  ].join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>${esc(meta.titre)}</title>
  <style>${getPrintReportCss({ legacy })}</style>
</head>
<body>
  <div class="print-doc">
    ${buildPrintHeaderHtml(meta)}
    ${buildPrintTitleBandHtml(meta.titre, meta.sousTitre, legacy)}
    ${meta.metaRows?.length ? buildMetaBoxHtml(meta.metaRows) : ""}
    ${meta.kpis?.length ? buildKpiGridHtml(meta.kpis, legacy) : ""}
    ${sectionsHtml}
    ${
      legacy
        ? `<div class="no-break" style="margin-top:20px">
      <p style="font-size:9pt;font-weight:bold;color:#1a5c2a;margin:0">Signature responsable</p>
      <div style="border-top:1px solid #1a5c2a;width:220px;margin-top:28px"></div>
    </div>`
        : ""
    }
    ${buildPrintFooterHtml(legacy)}
  </div>
  <script>window.onload=function(){window.print()}</script>
</body>
</html>`;
}

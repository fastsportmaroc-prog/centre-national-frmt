import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  buildFrmtPrintFooterHtml,
  buildFrmtPrintHeaderHtml,
  buildFrmtPrintTitleBlock,
  getFrmtPrintDocumentCss,
} from "@/lib/brand/document-theme";

export type FrmtDocumentMeta = {
  titre: string;
  sousTitre?: string;
  filtres?: string;
  utilisateur?: string;
  colonnes: string[];
  lignes: string[][];
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildFrmtDocumentHtml(meta: FrmtDocumentMeta): string {
  const dateGen = format(new Date(), "dd MMMM yyyy", { locale: fr }).toLocaleUpperCase("fr-FR");
  const user = meta.utilisateur ?? "—";
  const headers = meta.colonnes.map((c) => `<th>${esc(c)}</th>`).join("");
  const rows = meta.lignes
    .map((cells) => `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <title>${esc(meta.titre)}</title>
  <style>${getFrmtPrintDocumentCss()}</style>
</head>
<body>
  <div class="frmt-doc-sheet">
  ${buildFrmtPrintHeaderHtml({ generatedLabel: dateGen })}
  ${buildFrmtPrintTitleBlock(meta.titre, meta.sousTitre)}
  <p class="frmt-doc-meta">
    Généré le ${esc(dateGen)}<br/>
    Utilisateur : ${esc(user)}<br/>
    ${meta.filtres ? `Filtres : ${esc(meta.filtres)}` : ""}
  </p>
  <table class="frmt-table">
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${meta.colonnes.length}">Aucune donnée</td></tr>`}</tbody>
  </table>
  ${buildFrmtPrintFooterHtml()}
  </div>
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

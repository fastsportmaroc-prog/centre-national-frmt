"use client";

import {
  buildFrmtDocumentHtml,
  downloadPdfViaPrint,
  openPrintWindow,
  type FrmtDocumentMeta,
} from "@/lib/export/frmt-document";

export function exportModuleList(opts: {
  titre: string;
  sousTitre?: string;
  filtres?: string;
  utilisateur?: string;
  colonnes: string[];
  lignes: string[][];
  mode: "print" | "pdf";
}): void {
  const meta: FrmtDocumentMeta = {
    titre: opts.titre,
    sousTitre: opts.sousTitre,
    filtres: opts.filtres,
    utilisateur: opts.utilisateur ?? "Utilisateur connecté",
    colonnes: opts.colonnes,
    lignes: opts.lignes,
  };
  const html = buildFrmtDocumentHtml(meta);
  if (opts.mode === "print") {
    openPrintWindow(html, opts.titre);
  } else {
    downloadPdfViaPrint(html, opts.titre);
  }
}

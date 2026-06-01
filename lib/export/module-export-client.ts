"use client";

import { exportListePdf } from "@/lib/pdf/pdf-exports";

export function exportModuleList(opts: {
  titre: string;
  sousTitre?: string;
  filtres?: string;
  utilisateur?: string;
  colonnes: string[];
  lignes: string[][];
  mode: "print" | "pdf";
}): Promise<void> {
  const slug = opts.titre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return exportListePdf(
    opts.titre,
    opts.colonnes,
    opts.lignes,
    `${slug || "export"}.pdf`,
    false
  );
}

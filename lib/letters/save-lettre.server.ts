import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LettreOfficielleRecord, LettreReservationInput } from "@/lib/letters/letter-types";
import { generateLettreReservation } from "@/lib/letters/generateLettreReservation";
import { loadLettrePrintAssets } from "@/lib/letters/load-letter-assets.server";
import { buildLicenceReport } from "@/lib/letters/licence-report";
import { buildLettrePdfFilename } from "@/lib/letters/letter-filename";

export async function generateAndPersistLettre(
  input: LettreReservationInput & { stage_id: string }
): Promise<{
  ok: boolean;
  record?: LettreOfficielleRecord;
  error?: string;
}> {
  try {
    const printAssets = loadLettrePrintAssets();
    const generated = await generateLettreReservation(input, {
      logoBase64: printAssets.logo?.base64 ?? null,
      logoFormat: printAssets.logo?.format ?? "PNG",
      cachet: printAssets.cachet,
    });
    const id = crypto.randomUUID();
    const avecHebergement = generated.content.avecHebergement;
    const type = input.type ?? "reservation";
    const licenceReport = buildLicenceReport(input.joueurs, input.coachs);

    const row = {
      id,
      stage_id: input.stage_id,
      club_destinataire: input.clubDestinataire,
      date_lettre: new Date().toISOString().slice(0, 10),
      type,
      avec_hebergement: avecHebergement,
      avec_terrains: false,
      participants: generated.content.participants,
      exceptions_hebergement: input.exceptions ?? [],
      contenu_personnalise: input.contenuPersonnalise ?? null,
      statut: "generee",
      pdf_base64: generated.pdfBase64,
      docx_base64: generated.docxBase64,
      licences_complet: licenceReport.complete,
      licences_manquantes: licenceReport.missing.map((m) => `${m.prenom} ${m.nom}`),
      pdf_filename: buildLettrePdfFilename(input.stage.stage_action, input.stage.date_debut),
    };

    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.from("lettres_officielles").insert({
        id: row.id,
        stage_id: input.stage_id,
        club_destinataire: input.clubDestinataire,
        date_lettre: row.date_lettre,
        type,
        avec_hebergement: avecHebergement,
        avec_terrains: false,
        participants: generated.content.participants,
        exceptions_hebergement: input.exceptions ?? [],
        contenu_personnalise: input.contenuPersonnalise ?? null,
        statut: "generee",
      });
      if (error) console.warn("[lettres] insert:", error.message);
    }

    const record: LettreOfficielleRecord = {
      ...row,
      stage_nom: input.stage.stage_action,
      input_snapshot: { ...input, stage_id: input.stage_id },
      created_at: new Date().toISOString(),
    };

    return { ok: true, record };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur génération lettre";
    console.warn("Lettre non générée", e);
    return { ok: false, error: msg };
  }
}

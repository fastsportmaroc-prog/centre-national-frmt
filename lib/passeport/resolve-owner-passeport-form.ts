import { getAdminDocumentsRaw } from "@/lib/data/admin-documents";
import { normalizeDateForInput } from "@/lib/passeport/date-utils";
import type { AdminDocumentOwnerType } from "@/lib/types/admin-document";

/** Numéro + expiration pour formulaire (fiche + module Passeports & Visas). */
export async function resolveOwnerPasseportForForm(
  ownerType: AdminDocumentOwnerType,
  ownerId: string,
  ficheNumero?: string | null,
  ficheExpiration?: string | null
): Promise<{ numero: string; expiration: string }> {
  let numero = ficheNumero?.trim() ?? "";
  let expiration = normalizeDateForInput(ficheExpiration);

  try {
    const docs = await getAdminDocumentsRaw();
    const p = docs.find(
      (d) =>
        d.owner_type === ownerType &&
        d.owner_id === ownerId &&
        d.document_type === "passeport"
    );
    if (p?.document_number?.trim()) {
      numero = numero || p.document_number.trim();
    }
    if (p?.expiration_date) {
      expiration = expiration || normalizeDateForInput(p.expiration_date);
    }
  } catch {
    /* module indisponible : fiche seule */
  }

  return { numero, expiration };
}

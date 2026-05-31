import {
  createAdminDocument,
  getAdminDocumentsRaw,
  updateAdminDocument,
} from "@/lib/data/admin-documents";
import type { AdminDocument, AdminDocumentOwnerType } from "@/lib/types/admin-document";

export type OwnerPasseportInput = {
  document_number: string;
  expiration_date?: string | null;
  country?: string | null;
  notes?: string | null;
  file_url?: string | null;
};

/** Crée ou met à jour le passeport centralisé (admin_documents) d'une personne. */
export async function upsertOwnerPasseportDocument(
  ownerType: AdminDocumentOwnerType,
  ownerId: string,
  input: OwnerPasseportInput
): Promise<{ data: AdminDocument | null; error?: string }> {
  const numero = input.document_number.trim();
  if (!numero) {
    return { data: null, error: "Le numéro de passeport est obligatoire" };
  }

  const docs = await getAdminDocumentsRaw();
  const existing = docs.find(
    (d) =>
      d.owner_type === ownerType &&
      d.owner_id === ownerId &&
      d.document_type === "passeport"
  );

  const payload = {
    owner_type: ownerType,
    owner_id: ownerId,
    document_type: "passeport" as const,
    document_number: numero,
    country: input.country?.trim() || null,
    expiration_date: input.expiration_date || null,
    notes: input.notes?.trim() || null,
    file_url: input.file_url ?? null,
  };

  if (existing) {
    return updateAdminDocument(existing.id, payload);
  }
  return createAdminDocument(payload);
}

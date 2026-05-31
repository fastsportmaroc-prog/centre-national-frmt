import type { AdminDocument } from "@/lib/types/admin-document";
import type { VisaEntry } from "@/lib/types/passeport";

/** Expiration passeport : fiche + module Passeports & Visas. */
export function resolvePasseportExpiration(
  ownerType: "player" | "coach",
  ownerId: string,
  ficheExpiration: string | null | undefined,
  adminDocs: AdminDocument[]
): string | null {
  const fromFiche = ficheExpiration?.trim().slice(0, 10) || null;
  const doc = adminDocs.find(
    (d) =>
      d.owner_type === ownerType &&
      d.owner_id === ownerId &&
      d.document_type === "passeport" &&
      d.expiration_date
  );
  const fromModule = doc?.expiration_date?.trim().slice(0, 10) || null;
  return fromFiche || fromModule;
}

function adminVisasAsEntries(adminDocs: AdminDocument[], ownerType: "player" | "coach", ownerId: string): VisaEntry[] {
  return adminDocs
    .filter(
      (d) =>
        d.owner_type === ownerType &&
        d.owner_id === ownerId &&
        d.document_type === "visa"
    )
    .map((d) => ({
      id: d.id,
      pays: d.country ?? "",
      type_visa: "",
      date_debut: null,
      date_fin: d.expiration_date,
      numero_visa: d.document_number,
      image_visa_url: d.file_url,
      photo_visa_url: null,
      notes: d.notes,
    }));
}

export function resolveVisaSources(
  ownerType: "player" | "coach",
  ownerId: string,
  dossierVisas: VisaEntry[] | null | undefined,
  adminDocs: AdminDocument[]
): VisaEntry[] {
  const fromAdmin = adminVisasAsEntries(adminDocs, ownerType, ownerId);
  if (fromAdmin.length) return fromAdmin;
  return dossierVisas ?? [];
}

/** Documents administratifs — passeports & visas (joueurs / entraîneurs) */

export type AdminDocumentOwnerType = "player" | "coach";
export type AdminDocumentType = "passeport" | "visa";

export type AdminDocument = {
  id: string;
  owner_type: AdminDocumentOwnerType;
  owner_id: string;
  document_type: AdminDocumentType;
  document_number: string | null;
  country: string | null;
  expiration_date: string | null;
  file_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminDocumentInput = Omit<
  AdminDocument,
  "id" | "created_at" | "updated_at"
>;

export type AdminDocumentEnriched = AdminDocument & {
  owner_prenom: string;
  owner_nom: string;
  owner_role_label: string;
};

export type AdminDocumentAlertStats = {
  passeportsExpires: number;
  passeportsExpiring6Months: number;
  visasExpires: number;
  visasExpiring30Days: number;
};

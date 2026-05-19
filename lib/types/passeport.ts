export type VisaEntry = {
  id: string;
  pays: string;
  type_visa: string;
  date_debut: string | null;
  date_fin: string | null;
  numero_visa: string | null;
  image_visa_url: string | null;
  photo_visa_url: string | null;
  notes: string | null;
};

export type VisaInput = Omit<VisaEntry, "id">;

export type AssuranceVoyage = {
  compagnie: string | null;
  numero_police: string | null;
  date_debut: string | null;
  date_fin: string | null;
  couverture: string | null;
  image_url: string | null;
};

export type DossierPasseport = {
  id: string;
  joueur_id: string;
  numero_passeport: string | null;
  pays_emission: string | null;
  date_emission: string | null;
  date_expiration: string | null;
  image_passeport_url: string | null;
  visas: VisaEntry[];
  assurance: AssuranceVoyage | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DossierPasseportInput = Omit<
  DossierPasseport,
  "id" | "created_at" | "updated_at"
>;

export type DossierPasseportWithJoueur = DossierPasseport & {
  joueur?: { id: string; prenom: string; nom: string; nationalite: string | null };
};

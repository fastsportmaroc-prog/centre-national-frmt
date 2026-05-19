import type { DossierPasseport } from "@/lib/types/passeport";

const now = new Date().toISOString();

export const seedDossiersPasseport: DossierPasseport[] = [
  {
    id: "pass1",
    joueur_id: "j1",
    numero_passeport: "12AB34567",
    pays_emission: "Maroc",
    date_emission: "2020-06-01",
    date_expiration: "2026-08-15",
    image_passeport_url: null,
    visas: [
      {
        id: "v1",
        pays: "France",
        type_visa: "schengen",
        date_debut: "2025-01-01",
        date_fin: "2026-06-30",
        numero_visa: "FR-2025-001",
        image_visa_url: null,
        photo_visa_url: null,
        notes: "Tournois FFT",
      },
    ],
    assurance: {
      compagnie: "AXA Assistance",
      numero_police: "ASS-2025-789",
      date_debut: "2025-01-01",
      date_fin: "2025-12-31",
      couverture: "Mondiale — rapatriement médical",
      image_url: null,
    },
    notes: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "pass2",
    joueur_id: "j2",
    numero_passeport: "98ZX76543",
    pays_emission: "Maroc",
    date_emission: "2021-03-10",
    date_expiration: "2031-03-09",
    image_passeport_url: null,
    visas: [],
    assurance: null,
    notes: "Renouvellement à prévoir",
    created_at: now,
    updated_at: now,
  },
];

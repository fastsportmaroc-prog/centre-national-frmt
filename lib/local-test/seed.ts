import type { Infrastructure } from "@/lib/types/infrastructures";
import type { Entraineur } from "@/lib/types/entraineurs";
import type { Joueur } from "@/lib/types/database";
import type { Materiel } from "@/lib/types/materiel";
import { readJson, writeJson } from "./storage";

const now = () => new Date().toISOString();

function baseInfra(
  id: string,
  nom: string,
  surface: Infrastructure["surface"],
  type: Infrastructure["type"] = "terrain"
): Infrastructure {
  return {
    id,
    nom,
    type,
    surface,
    capacite: type === "terrain" ? 4 : 20,
    actif: true,
    statut: "disponible",
    notes: null,
    created_at: now(),
    updated_at: now(),
  };
}

export function getDefaultInfrastructures(): Infrastructure[] {
  return [
    baseInfra("local-court-1", "Court 1 terre battue", "terre_battue"),
    baseInfra("local-court-2", "Court 2 terre battue", "terre_battue"),
    baseInfra("local-court-3", "Court 3 terre battue", "terre_battue"),
    baseInfra("local-court-4", "Court 4 dur", "dur"),
    baseInfra("local-court-5", "Court 5 dur", "dur"),
    baseInfra("local-fitness", "Salle fitness", "indoor", "fitness"),
    baseInfra("local-natation", "Salle natation", "indoor", "natation"),
    baseInfra("local-physique", "Espace physique", "autre", "emplacement_physique"),
  ];
}

export function getDefaultJoueurs(): Joueur[] {
  const t = now();
  return [
    {
      id: "local-joueur-1",
      photo_url: null,
      nom: "Alaoui",
      prenom: "Youssef",
      date_naissance: "2008-03-12",
      categorie_age: "U16",
      sexe: "M",
      nationalite: "Maroc",
      email: null,
      telephone: null,
      niveau: null,
      classement: "15/2",
      groupe_id: null,
      coach_referent: null,
      statut: "actif",
      documents: null,
      notes: null,
      created_at: t,
    },
    {
      id: "local-joueur-2",
      photo_url: null,
      nom: "Benali",
      prenom: "Sara",
      date_naissance: "2009-07-22",
      categorie_age: "U16",
      sexe: "F",
      nationalite: "Maroc",
      email: null,
      telephone: null,
      niveau: null,
      classement: "15/4",
      groupe_id: null,
      coach_referent: null,
      statut: "actif",
      documents: null,
      notes: null,
      created_at: t,
    },
    {
      id: "local-joueur-3",
      photo_url: null,
      nom: "Chraibi",
      prenom: "Mehdi",
      date_naissance: "2008-01-15",
      categorie_age: "U16",
      sexe: "M",
      nationalite: "Maroc",
      email: null,
      telephone: null,
      niveau: null,
      classement: "15/5",
      groupe_id: null,
      coach_referent: null,
      statut: "actif",
      documents: null,
      notes: null,
      created_at: t,
    },
    {
      id: "local-joueur-4",
      photo_url: null,
      nom: "Fassi",
      prenom: "Lina",
      date_naissance: "2009-11-03",
      categorie_age: "U16",
      sexe: "F",
      nationalite: "Maroc",
      email: null,
      telephone: null,
      niveau: null,
      classement: "15/6",
      groupe_id: null,
      coach_referent: null,
      statut: "actif",
      documents: null,
      notes: null,
      created_at: t,
    },
    {
      id: "local-joueur-5",
      photo_url: null,
      nom: "Bennani",
      prenom: "Omar",
      date_naissance: "2007-05-20",
      categorie_age: "U16",
      sexe: "M",
      nationalite: "Maroc",
      email: null,
      telephone: null,
      niveau: null,
      classement: "15/3",
      groupe_id: null,
      coach_referent: null,
      statut: "actif",
      documents: null,
      notes: null,
      created_at: t,
    },
    {
      id: "local-joueur-6",
      photo_url: null,
      nom: "Tazi",
      prenom: "Nadia",
      date_naissance: "2008-09-08",
      categorie_age: "U16",
      sexe: "F",
      nationalite: "Maroc",
      email: null,
      telephone: null,
      niveau: null,
      classement: "15/4",
      groupe_id: null,
      coach_referent: null,
      statut: "actif",
      documents: null,
      notes: null,
      created_at: t,
    },
  ];
}

export function getDefaultEntraineurs(): Entraineur[] {
  const t = now();
  return [
    {
      id: "local-coach-1",
      nom: "Idrissi",
      prenom: "Karim",
      email: null,
      telephone: null,
      specialite: "Performance",
      licence_fft: null,
      statut: "actif",
      groupe_ids: [],
      budget_voyages_annuel: null,
      photo_url: null,
      notes: null,
      created_at: t,
    },
    {
      id: "local-coach-2",
      nom: "Amrani",
      prenom: "Sofia",
      email: null,
      telephone: null,
      specialite: "Jeunes",
      licence_fft: null,
      statut: "actif",
      groupe_ids: [],
      budget_voyages_annuel: null,
      photo_url: null,
      notes: null,
      created_at: t,
    },
  ];
}

export function getDefaultMateriels(): Materiel[] {
  return [];
}

export function ensureLocalSeedData(): void {
  if (!readJson<Infrastructure[]>("infrastructures", []).length) {
    writeJson("infrastructures", getDefaultInfrastructures());
  }
  if (!readJson<Joueur[]>("joueurs", []).length) {
    writeJson("joueurs", getDefaultJoueurs());
  }
  if (!readJson<Entraineur[]>("entraineurs", []).length) {
    writeJson("entraineurs", getDefaultEntraineurs());
  }
}

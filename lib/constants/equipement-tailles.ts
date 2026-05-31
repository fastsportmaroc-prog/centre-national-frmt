import type { Materiel } from "@/lib/types/materiel";
import type { EntraineurV2, JoueurV2 } from "@/lib/types/v2";
import { resolveJoueurSexe } from "@/lib/v2/joueur-sexe-display";

export type EquipementTailleFields = {
  taille_survetement?: string | null;
  taille_tshirt?: string | null;
  taille_short?: string | null;
  taille_jupe?: string | null;
  taille_chaussures?: string | null;
};

export type EquipementKindId =
  | "survetement"
  | "tshirt"
  | "short"
  | "jupe"
  | "chaussures";

export type EquipementKind = {
  id: EquipementKindId;
  label: string;
  field: keyof EquipementTailleFields;
  keywords: string[];
  fillesOnly?: boolean;
  /** Masqué pour les entraîneurs */
  coachHidden?: boolean;
};

export const EQUIPEMENT_KINDS: EquipementKind[] = [
  {
    id: "survetement",
    label: "Survêtement",
    field: "taille_survetement",
    keywords: ["survet", "survêt", "tracksuit", "ensemble"],
  },
  {
    id: "tshirt",
    label: "T-shirt",
    field: "taille_tshirt",
    keywords: ["t-shirt", "tshirt", "tee-shirt", "tee shirt", "polo"],
  },
  {
    id: "short",
    label: "Short",
    field: "taille_short",
    keywords: ["short", "bermuda"],
  },
  {
    id: "jupe",
    label: "Jupe (filles)",
    field: "taille_jupe",
    keywords: ["jupe", "skirt"],
    fillesOnly: true,
    coachHidden: true,
  },
  {
    id: "chaussures",
    label: "Chaussures",
    field: "taille_chaussures",
    keywords: ["chaussure", "chaussures", "basket", "shoe", "tennis"],
  },
];

function normName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function equipementKindsForJoueur(joueur: JoueurV2): EquipementKind[] {
  const sexe = resolveJoueurSexe({
    sexe: joueur.sexe,
    categorie_age: joueur.categorie_age,
    categorie: joueur.categorie,
    nom: joueur.nom,
    prenom: joueur.prenom,
  });
  return EQUIPEMENT_KINDS.filter((k) => !k.coachHidden && (!k.fillesOnly || sexe === "F"));
}

export function equipementKindsForCoach(_coach: EntraineurV2): EquipementKind[] {
  return EQUIPEMENT_KINDS.filter((k) => !k.fillesOnly && !k.coachHidden);
}

export function getEquipementTaille(
  person: EquipementTailleFields,
  kind: EquipementKind
): string {
  const v = person[kind.field];
  return typeof v === "string" ? v.trim() : "";
}

export function matchMaterielForEquipementKind(
  stock: Materiel[],
  kind: EquipementKind
): Materiel | null {
  const scored = stock
    .map((m) => {
      const n = normName(m.nom);
      let score = 0;
      for (const kw of kind.keywords) {
        if (n.includes(normName(kw))) score += 10;
      }
      if (kind.id === "short" && n.includes("jupe")) score -= 50;
      if (kind.id === "jupe" && !n.includes("jupe") && !n.includes("skirt")) score -= 20;
      if (kind.id === "chaussures" && (n.includes("t-shirt") || n.includes("short"))) score -= 30;
      return { m, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.m ?? null;
}

export function equipementTaillesComplets(
  person: EquipementTailleFields,
  kinds: EquipementKind[]
): boolean {
  return kinds.every((k) => Boolean(getEquipementTaille(person, k)));
}

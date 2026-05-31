export type KineStackKey = "Musculaire" | "Articulaire" | "Préventif" | "Autre";

export function kineMotifToStack(motif?: string | null): KineStackKey {
  const m = (motif ?? "").toLowerCase();
  if (/muscul|contract|tension|élong|elong/.test(m)) return "Musculaire";
  if (/artic|genou|épaule|epaule|cheville|poignet|dos/.test(m)) return "Articulaire";
  if (/prévent|prevent|warm|échauff|echauff|proprio/.test(m)) return "Préventif";
  return "Autre";
}

/** Mapping pays courants → emoji drapeau (affichage PDF Helvetica-compatible via unicode). */
const FLAGS: Record<string, string> = {
  maroc: "🇲🇦",
  morocco: "🇲🇦",
  france: "🇫🇷",
  espagne: "🇪🇸",
  spain: "🇪🇸",
  espana: "🇪🇸",
  italie: "🇮🇹",
  italy: "🇮🇹",
  usa: "🇺🇸",
  "etats-unis": "🇺🇸",
  "états-unis": "🇺🇸",
  tunisie: "🇹🇳",
  algerie: "🇩🇿",
  algérie: "🇩🇿",
  portugal: "🇵🇹",
  belgique: "🇧🇪",
  suisse: "🇨🇭",
  "royaume-uni": "🇬🇧",
  uk: "🇬🇧",
  allemagne: "🇩🇪",
  qatar: "🇶🇦",
  "emirats arabes unis": "🇦🇪",
  "émirats arabes unis": "🇦🇪",
};

export function flagForPays(pays: string | null | undefined): string {
  if (!pays?.trim()) return "";
  const key = pays.trim().toLowerCase();
  return FLAGS[key] ?? "🌍";
}

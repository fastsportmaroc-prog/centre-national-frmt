/** « reda-bennani » → « Reda Bennani » */
export function displayNameFromAtpSlug(slug: string): string {
  return slug
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function resolveAtpDisplayName(slug: string, htmlName: string): string {
  const fromSlug = slug ? displayNameFromAtpSlug(slug) : "";
  const trimmed = htmlName.replace(/\s+/g, " ").trim();
  if (fromSlug && fromSlug.length > trimmed.length) return fromSlug;
  return trimmed || fromSlug;
}

export function displayNameForCneJoueur(
  prenom: string | null | undefined,
  nom: string | null | undefined
): string {
  return `${prenom ?? ""} ${nom ?? ""}`.replace(/\s+/g, " ").trim();
}

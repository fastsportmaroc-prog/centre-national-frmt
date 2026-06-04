/**
 * Résolution canonique des courts : un seul id `infrastructures` par nom logique
 * (ex. « Court 1 » et « Court 1 — Terre Battue » → même court).
 */

export type InfrastructureRef = {
  id: string;
  nom: string;
  actif?: boolean | null;
  type?: string | null;
};

/** Clé de comparaison insensible aux accents, tirets et suffixes surface. */
export function normalizeCourtNomKey(nom: string): string {
  return nom
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[—–-]/g, " ")
    .replace(/\s+(terre battue|surface dure|surface dur|hard court)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalScore(i: InfrastructureRef): number {
  const nom = String(i.nom ?? "").trim();
  let score = nom.length;
  if (/[—–-]/.test(nom) && /terre|dur|surface|hard/i.test(nom)) score += 200;
  if (i.actif === false) score += 1000;
  return score;
}

export type InfrastructureAliasIndex = {
  /** id alias → id canonique */
  aliasToCanonical: Map<string, string>;
  /** clé nom → id canonique */
  canonicalIdByNomKey: Map<string, string>;
  /** id canonique → nom affiché */
  canonicalNomById: Map<string, string>;
};

export function buildInfrastructureAliasIndex(
  infras: InfrastructureRef[]
): InfrastructureAliasIndex {
  const byKey = new Map<string, InfrastructureRef[]>();
  for (const i of infras) {
    const key = normalizeCourtNomKey(i.nom);
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push(i);
    byKey.set(key, list);
  }

  const aliasToCanonical = new Map<string, string>();
  const canonicalIdByNomKey = new Map<string, string>();
  const canonicalNomById = new Map<string, string>();

  for (const [key, group] of byKey) {
    const sorted = [...group].sort((a, b) => canonicalScore(a) - canonicalScore(b));
    const canonical = sorted[0]!;
    canonicalIdByNomKey.set(key, canonical.id);
    canonicalNomById.set(canonical.id, String(canonical.nom ?? "").trim());
    for (const row of group) {
      aliasToCanonical.set(row.id, canonical.id);
    }
  }

  return { aliasToCanonical, canonicalIdByNomKey, canonicalNomById };
}

export function toCanonicalInfrastructureId(
  id: string,
  index: InfrastructureAliasIndex
): string {
  return index.aliasToCanonical.get(id) ?? id;
}

/** Tous les ids (canonique + alias) partageant le même court logique. */
export function equivalentInfrastructureIds(
  id: string,
  index: InfrastructureAliasIndex
): string[] {
  const canonical = toCanonicalInfrastructureId(id, index);
  const ids = new Set<string>([canonical]);
  for (const [alias, can] of index.aliasToCanonical) {
    if (can === canonical) ids.add(alias);
  }
  return [...ids];
}

export function findInfrastructureByNom(
  infras: InfrastructureRef[],
  nom: string
): InfrastructureRef | null {
  const key = normalizeCourtNomKey(nom);
  if (!key) return null;
  const exact = infras.find((i) => normalizeCourtNomKey(i.nom) === key);
  if (exact) return exact;
  const courtNum = key.match(/court\s*(\d+)/);
  if (courtNum?.[1]) {
    const num = courtNum[1];
    const byNum = infras.find((i) => {
      const k = normalizeCourtNomKey(i.nom);
      return new RegExp(`court\\s*0*${num}\\b`).test(k);
    });
    if (byNum) return byNum;
  }
  return (
    infras.find((i) => {
      const k = normalizeCourtNomKey(i.nom);
      return k.includes(key) || key.includes(k);
    }) ?? null
  );
}

/** Liste dédupliquée : un court par clé nom, id canonique. */
export function dedupeInfrastructuresByCourtNom<T extends InfrastructureRef>(
  infras: T[],
  index: InfrastructureAliasIndex
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const i of infras) {
    const canonical = toCanonicalInfrastructureId(i.id, index);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    const nom = index.canonicalNomById.get(canonical) ?? i.nom;
    out.push({ ...i, id: canonical, nom });
  }
  return out;
}

export function courtBesoinMergeKey(
  terrainId: string,
  terrainNom: string | undefined,
  index: InfrastructureAliasIndex
): string {
  const canonical = toCanonicalInfrastructureId(terrainId, index);
  if (index.aliasToCanonical.has(terrainId) || index.canonicalNomById.has(canonical)) {
    return canonical;
  }
  if (terrainNom?.trim()) {
    const key = normalizeCourtNomKey(terrainNom);
    const byNom = index.canonicalIdByNomKey.get(key);
    if (byNom) return byNom;
  }
  return canonical;
}

export function courtNomsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  return normalizeCourtNomKey(a) === normalizeCourtNomKey(b);
}

export type TerrainBesoinRef = { terrainId: string; terrainNom?: string };

export function extractCourtNumber(nom: string): string | null {
  const m = normalizeCourtNomKey(nom).match(/court\s*0*(\d+)\b/);
  return m?.[1] ?? null;
}

/** Même court logique (nom ou numéro « Court N »). */
export function besoinsSameCourt(a: TerrainBesoinRef, b: TerrainBesoinRef): boolean {
  if (a.terrainNom?.trim() && b.terrainNom?.trim()) {
    if (normalizeCourtNomKey(a.terrainNom) === normalizeCourtNomKey(b.terrainNom)) return true;
  }
  const numA = a.terrainNom?.trim() ? extractCourtNumber(a.terrainNom) : null;
  const numB = b.terrainNom?.trim() ? extractCourtNumber(b.terrainNom) : null;
  if (numA && numB && numA === numB) return true;
  if (a.terrainId && a.terrainId === b.terrainId) return true;
  return false;
}

export function besoinCourtKey(b: TerrainBesoinRef): string {
  if (b.terrainNom?.trim()) return normalizeCourtNomKey(b.terrainNom);
  const num = extractCourtNumber(b.terrainNom ?? "");
  if (num) return `court ${num}`;
  return `id:${b.terrainId}`;
}

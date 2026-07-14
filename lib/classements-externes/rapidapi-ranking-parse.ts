/**
 * Parsing réponses RapidAPI "Tennis API" (tennisapi1.p.rapidapi.com, source SofaScore).
 * Endpoints :
 *  - /api/tennis/rankings/atp | /wta  -> { rankings: [{ rowName, ranking, points, team:{id,slug,gender} }] }
 *  - /api/tennis/search/{q}           -> { results: [{ entity:{ id, name, slug, gender, country } }] }
 *  - /api/tennis/team/{id}/rankings   -> { rankings: [{ rowName, ranking, points, team:{gender} }] }
 */

export type Genre = "M" | "F" | null;

export type ParsedRankingRow = {
  name: string;
  position: number;
  points: number | null;
  playerId: string | null;
  genre: Genre;
};

export type ParsedSearchPlayer = {
  name: string;
  playerId: string;
  slug: string | null;
  genre: Genre;
  countryAlpha2: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function toNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)))
    return Number(value);
  return null;
}

function normalizeGenre(value: unknown): Genre {
  const s = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (s === "M") return "M";
  if (s === "F") return "F";
  return null;
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(value: string): string[] {
  return normalizeName(value)
    .split(" ")
    .filter((t) => t.length >= 2);
}

function parseRankingItem(item: unknown): ParsedRankingRow | null {
  const row = asRecord(item);
  if (!row) return null;
  const team = asRecord(row.team);

  const name =
    (typeof row.rowName === "string" && row.rowName.trim()) ||
    (team && typeof team.name === "string" && team.name.trim()) ||
    "";
  if (!name) return null;

  const position = toInt(row.ranking) ?? toInt(row.position) ?? toInt(team?.ranking);
  if (position == null) return null;

  const points = toNum(row.points);
  const playerId = team ? (toInt(team.id) != null ? String(team.id) : null) : null;
  const genre = normalizeGenre(team?.gender) ?? normalizeGenre(row.gender);

  return { name: name.trim(), position, points, playerId, genre };
}

/** Extrait les lignes de classement (rankings/atp, rankings/wta, team/{id}/rankings). */
export function extractRankingRows(payload: unknown): ParsedRankingRow[] {
  const root = asRecord(payload);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(root?.rankings)
      ? (root!.rankings as unknown[])
      : Array.isArray(root?.data)
        ? (root!.data as unknown[])
        : [];
  const rows: ParsedRankingRow[] = [];
  for (const item of list) {
    const row = parseRankingItem(item);
    if (row) rows.push(row);
  }
  return rows;
}

/** Résultats /api/tennis/search/{q}. */
export function extractSearchPlayers(payload: unknown): ParsedSearchPlayer[] {
  const root = asRecord(payload);
  if (!root) return [];
  const list = Array.isArray(root.results)
    ? root.results
    : Array.isArray(root.data)
      ? (root.data as unknown[])
      : [];
  const players: ParsedSearchPlayer[] = [];
  for (const item of list) {
    const wrap = asRecord(item);
    if (!wrap) continue;
    const entity = asRecord(wrap.entity) ?? wrap;
    const type = typeof wrap.type === "string" ? wrap.type : entity.type;
    // Ne garder que les joueurs (SofaScore: type "team" pour un joueur de tennis).
    if (typeof type === "string" && type !== "team" && type !== "player") continue;
    const id = toInt(entity.id);
    const name = typeof entity.name === "string" ? entity.name.trim() : "";
    if (id == null || !name) continue;
    const country = asRecord(entity.country);
    players.push({
      name,
      playerId: String(id),
      slug: typeof entity.slug === "string" ? entity.slug : null,
      genre: normalizeGenre(entity.gender),
      countryAlpha2:
        country && typeof country.alpha2 === "string" ? country.alpha2 : null,
    });
  }
  return players;
}

/** Premier classement singles depuis /api/tennis/team/{id}/rankings. */
export function extractProfileRanking(payload: unknown): {
  rang: number;
  points: number | null;
  genre: Genre;
} | null {
  const rows = extractRankingRows(payload);
  if (!rows.length) return null;
  // La 1re entrée correspond au classement simple courant.
  const best = rows[0];
  return { rang: best.position, points: best.points, genre: best.genre };
}

export function nameKeysForJoueur(prenom: string, nom: string): string[] {
  const p = prenom.trim().replace(/\s+/g, " ");
  const n = nom.trim().replace(/\s+/g, " ");
  const nomParts = n.split(" ").filter((t) => t.length >= 2);
  const keys = new Set<string>();
  const full = normalizeName(`${p} ${n}`);
  const reversed = normalizeName(`${n} ${p}`);
  if (full) keys.add(full);
  if (reversed) keys.add(reversed);
  // Nom composé FRMT (ex. BENNANI ZIATNI) vs API (Karim Bennani)
  if (p && nomParts[0]) keys.add(normalizeName(`${p} ${nomParts[0]}`));
  if (p && nomParts.length > 1) {
    keys.add(normalizeName(`${p} ${nomParts[0]} ${nomParts[nomParts.length - 1]}`));
  }
  return [...keys].filter(Boolean);
}

function firstNameMatches(playerFirst: string, candidateTokens: string[]): boolean {
  if (!playerFirst) return true;
  return candidateTokens.some(
    (t) =>
      t === playerFirst ||
      t.startsWith(playerFirst.slice(0, Math.min(3, playerFirst.length))) ||
      playerFirst.startsWith(t.slice(0, Math.min(3, t.length)))
  );
}

function fuzzyTokensMatch(playerTokens: string[], candidateKey: string): boolean {
  const candidateTokens = candidateKey.split(" ").filter(Boolean);
  if (!playerTokens.length || !candidateTokens.length) return false;

  const firstName = playerTokens[0] ?? "";
  const nomTokens = playerTokens.slice(1);

  if (!firstNameMatches(firstName, candidateTokens)) return false;

  // Au moins une partie du nom (ex. BENNANI dans BENNANI ZIATNI) doit figurer dans l'API
  if (nomTokens.some((t) => t.length >= 3 && candidateTokens.includes(t))) return true;

  // Fallback : dernier token = nom de famille simple
  const lastName = nomTokens[nomTokens.length - 1] ?? firstName;
  return candidateTokens.includes(lastName);
}

export function findJoueurInRankingCache(
  prenom: string,
  nom: string,
  cache: Map<string, { rang: number; points: number | null; apiPlayerId?: string | null }>
): { rang: number; points: number | null; apiPlayerId?: string | null } | null {
  for (const key of nameKeysForJoueur(prenom, nom)) {
    const hit = cache.get(key);
    if (hit) return hit;
  }

  const tokens = nameTokens(`${prenom} ${nom}`);
  if (tokens.length < 2) return null;

  for (const [candidateKey, hit] of cache) {
    if (fuzzyTokensMatch(tokens, candidateKey)) return hit;
  }
  return null;
}

export function pickSearchMatch(
  prenom: string,
  nom: string,
  players: ParsedSearchPlayer[],
  expectedGenre?: Genre,
  preferredCountryAlpha2?: string | null
): ParsedSearchPlayer | null {
  const expected = new Set(nameKeysForJoueur(prenom, nom));
  const genreOk = (p: ParsedSearchPlayer) =>
    !expectedGenre || !p.genre || p.genre === expectedGenre;
  const countryScore = (p: ParsedSearchPlayer) => {
    if (!preferredCountryAlpha2) return 0;
    return p.countryAlpha2?.toUpperCase() === preferredCountryAlpha2.toUpperCase() ? 2 : 0;
  };

  const ranked = [...players].sort((a, b) => countryScore(b) - countryScore(a));

  const exact = ranked.find((p) => expected.has(normalizeName(p.name)) && genreOk(p));
  if (exact) return exact;

  const tokens = nameTokens(`${prenom} ${nom}`);
  for (const p of ranked) {
    if (genreOk(p) && fuzzyTokensMatch(tokens, normalizeName(p.name))) return p;
  }
  return null;
}

/** Termes de recherche API (nom de famille d'abord — plus efficace hors top 500). */
export function searchTermsForJoueur(prenom: string, nom: string): string[] {
  const p = prenom.trim().replace(/\s+/g, " ");
  const n = nom.trim().replace(/\s+/g, " ");
  const nomParts = n.split(" ").filter((t) => t.length >= 2);
  const terms = new Set<string>();
  if (nomParts[0]) terms.add(nomParts[0]);
  if (nomParts.length > 1) terms.add(nomParts[nomParts.length - 1]!);
  const full = `${p} ${n}`.trim();
  if (full.length >= 3) terms.add(full);
  if (p && nomParts[0]) terms.add(`${p} ${nomParts[0]}`.trim());
  return [...terms].filter((t) => t.length >= 3);
}

import { ageFromBirthDate } from "@/lib/classements-maroc-scrapes/week";
import type {
  ClassementMarocDiscipline,
  ClassementMarocScrapeInput,
} from "@/lib/types/classements-maroc-scrapes";

const WTA_RANKED_URL = "https://api.wtatennis.com/tennis/players/ranked";
const WTA_SINGLES_PAGE = "https://www.wtatennis.com/rankings/singles";
const WTA_DOUBLES_PAGE = "https://www.wtatennis.com/rankings/doubles";
const USER_AGENT = "FRMT-Centre-National/1.0 (+usage-interne; classements-maroc)";
const PAGE_SIZE = 100;
const MAX_RANK = 2500;
const REQUEST_DELAY_MS = 800;

export type ParsedWtaRow = Omit<
  ClassementMarocScrapeInput,
  "semaine_releve" | "type_classement" | "genre" | "discipline"
>;

type WtaRankedItem = {
  player?: {
    id?: number;
    fullName?: string;
    countryCode?: string;
    dateOfBirth?: string;
  };
  ranking?: number;
  points?: number;
  movement?: number;
  rankedAt?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function wtaRankingsUrl(
  date?: string,
  discipline: ClassementMarocDiscipline = "simple"
): string {
  const page = discipline === "double" ? WTA_DOUBLES_PAGE : WTA_SINGLES_PAGE;
  if (!date) return page;
  return `${page}?date=${encodeURIComponent(date)}`;
}

/** @deprecated use wtaRankingsUrl */
export function wtaSinglesUrl(date?: string): string {
  return wtaRankingsUrl(date, "simple");
}

/**
 * Classement WTA Maroc — historique via `at=YYYY-MM-DD`
 * Simple : type=rankSingles ; Double : type=rankDoubles
 */
export async function fetchWtaMoroccoRankings(options?: {
  at?: string;
  discipline?: ClassementMarocDiscipline;
}): Promise<{
  rows: ParsedWtaRow[];
  sourceUrl: string;
  pagesFetched: number;
  rankedAt: string | null;
}> {
  const at = options?.at;
  const discipline = options?.discipline ?? "simple";
  const sourceUrl = wtaRankingsUrl(at, discipline);
  const type = discipline === "double" ? "rankDoubles" : "rankSingles";
  const metric = discipline === "double" ? "doubles" : "singles";

  const moroccan: ParsedWtaRow[] = [];
  let page = 0;
  let pagesFetched = 0;
  let stop = false;
  let rankedAt: string | null = null;

  while (!stop && page < 30) {
    const params = new URLSearchParams({
      type,
      metric,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (at) params.set("at", at);

    const url = `${WTA_RANKED_URL}?${params}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      throw new Error(`WTA rankings HTTP ${res.status} (page ${page}, ${discipline})`);
    }

    const batch = (await res.json()) as WtaRankedItem[];
    pagesFetched++;
    if (!Array.isArray(batch) || batch.length === 0) break;

    let maxRankOnPage = 0;
    for (const item of batch) {
      const rank = item.ranking ?? 0;
      if (rank > maxRankOnPage) maxRankOnPage = rank;
      if (!rankedAt && item.rankedAt) {
        rankedAt = String(item.rankedAt).slice(0, 10);
      }
      if (item.player?.countryCode !== "MAR") continue;
      const name = (item.player.fullName ?? "").trim();
      if (!name || rank <= 0) continue;

      moroccan.push({
        nom_joueur: name,
        rang: rank,
        points: typeof item.points === "number" ? item.points : null,
        evolution: typeof item.movement === "number" ? item.movement : null,
        age: ageFromBirthDate(item.player.dateOfBirth),
        source_url: sourceUrl,
        source_player_id: item.player.id != null ? String(item.player.id) : null,
      });
    }

    if (maxRankOnPage >= MAX_RANK || batch.length < PAGE_SIZE) stop = true;
    page++;
    if (!stop) await sleep(REQUEST_DELAY_MS);
  }

  moroccan.sort((a, b) => a.rang - b.rang);
  return { rows: moroccan, sourceUrl, pagesFetched, rankedAt };
}

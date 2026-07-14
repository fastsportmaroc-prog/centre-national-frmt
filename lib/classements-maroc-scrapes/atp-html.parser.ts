import type { ClassementMarocScrapeInput } from "@/lib/types/classements-maroc-scrapes";
import type { ClassementMarocDiscipline } from "@/lib/types/classements-maroc-scrapes";

import { resolveAtpDisplayName } from "@/lib/classements-maroc-scrapes/display-name";
import { fetchHtmlWithFallback } from "@/lib/classements-maroc-scrapes/fetch-html.server";

const ATP_SINGLES_BASE =
  "https://www.atptour.com/en/rankings/singles?region=MAR&rankRange=0-5000";
const ATP_DOUBLES_BASE =
  "https://www.atptour.com/en/rankings/doubles?region=MAR&rankRange=0-5000";

export function atpMarocUrl(
  dateWeek?: string,
  discipline: ClassementMarocDiscipline = "simple"
): string {
  const base = discipline === "double" ? ATP_DOUBLES_BASE : ATP_SINGLES_BASE;
  if (!dateWeek) return base;
  return `${base}&dateWeek=${encodeURIComponent(dateWeek)}`;
}

export type ParsedAtpRow = Omit<
  ClassementMarocScrapeInput,
  "semaine_releve" | "type_classement" | "genre" | "discipline"
>;

function parseEvolution(block: string): number | null {
  if (block.includes("rank-up")) {
    const m = block.match(/rank-up">(\d+)/);
    if (m) return Number(m[1]);
  }
  if (block.includes("rank-down")) {
    const m = block.match(/rank-down">(\d+)/);
    if (m) return -Number(m[1]);
  }
  if (block.includes("icon-minus") || block.includes("rank-same")) return 0;
  return null;
}

export function parseAtpMoroccoHtml(
  html: string,
  sourceUrl = ATP_SINGLES_BASE
): ParsedAtpRow[] {
  const rows: ParsedAtpRow[] = [];
  const trRe = /<tr class="lower-row">([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;

  while ((match = trRe.exec(html)) !== null) {
    const block = match[1] ?? "";
    const rankM = block.match(/<td class="rank[^"]*"[^>]*>\s*(\d+)\s*<\/td>/);
    const playerM = block.match(
      /href="\/en\/players\/([^/]+)\/([^/]+)\/overview"[\s\S]*?<span class="lastName">([^<]+)<\/span>/
    );
    const pointsM = block.match(
      /class="points[^"]*"[\s\S]*?<a[^>]*>\s*([\d,]+)\s*<\/a>/
    );
    if (!rankM || !playerM) continue;

    const slug = playerM[1] ?? "";
    const playerCode = playerM[2] ?? "";
    const displayName = resolveAtpDisplayName(slug, playerM[3] ?? "");
    const pointsRaw = (pointsM?.[1] ?? "").replace(/,/g, "");
    const points = pointsRaw ? Number(pointsRaw) : null;

    rows.push({
      nom_joueur: displayName,
      rang: Number(rankM[1]),
      points: Number.isFinite(points) ? points : null,
      evolution: parseEvolution(block),
      age: null,
      source_url: sourceUrl,
      source_player_id: slug && playerCode ? `${slug}/${playerCode}` : slug || null,
    });
  }

  return rows;
}

export async function fetchAtpMoroccoRankings(options?: {
  dateWeek?: string;
  discipline?: ClassementMarocDiscipline;
}): Promise<{
  rows: ParsedAtpRow[];
  sourceUrl: string;
}> {
  const discipline = options?.discipline ?? "simple";
  const sourceUrl = atpMarocUrl(options?.dateWeek, discipline);
  const html = await fetchHtmlWithFallback(sourceUrl, {
    Referer:
      discipline === "double"
        ? "https://www.atptour.com/en/rankings/doubles"
        : "https://www.atptour.com/en/rankings/singles",
  });
  return { rows: parseAtpMoroccoHtml(html, sourceUrl), sourceUrl };
}

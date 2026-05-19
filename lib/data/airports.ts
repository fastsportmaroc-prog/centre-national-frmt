import worldAirports from "@/data/airports/world.json";

export type Airport = {
  iata: string;
  city: string;
  name: string;
  country: string;
  countryCode: string;
};

const AIRPORTS = worldAirports as Airport[];

/** Aéroports FRMT / Maroc en tête de liste */
const PRIORITY_IATA = ["CMN", "RBA", "RAK", "AGA", "FEZ", "TNG", "CDG", "ORY", "MAD", "BCN"];

export function formatAirportLabel(a: Airport): string {
  return `${a.iata} — ${a.city}, ${a.name} (${a.country})`;
}

export function formatAirportShort(a: Airport): string {
  return `${a.iata} — ${a.city}`;
}

export function getAirportByIata(iata: string): Airport | undefined {
  return AIRPORTS.find((a) => a.iata.toUpperCase() === iata.toUpperCase());
}

export function searchAirports(query: string, limit = 15): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return PRIORITY_IATA.map((code) => getAirportByIata(code)).filter(
      (a): a is Airport => Boolean(a)
    );
  }

  const scored = AIRPORTS.map((a) => {
    const hay = `${a.iata} ${a.city} ${a.name} ${a.country}`.toLowerCase();
    let score = 0;
    if (a.iata.toLowerCase() === q) score += 100;
    if (a.iata.toLowerCase().startsWith(q)) score += 50;
    if (a.city.toLowerCase().startsWith(q)) score += 40;
    if (hay.includes(q)) score += 20;
    if (PRIORITY_IATA.includes(a.iata)) score += 5;
    return { a, score };
  })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score);

  return scored.slice(0, limit).map((x) => x.a);
}

export function getAllAirports(): Airport[] {
  return [...AIRPORTS];
}

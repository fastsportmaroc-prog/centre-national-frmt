import { formatAirportLabel, getAirportByIata } from "@/lib/data/airports";

export const DUREE_SEJOUR_DEFAUT_JOURS = 7;

export const AEROPORT_DEPART_DEFAUT_IATA = "CMN";

export function defaultDepartLabel(): string {
  const a = getAirportByIata(AEROPORT_DEPART_DEFAUT_IATA);
  return a ? formatAirportLabel(a) : "CMN — Casablanca";
}

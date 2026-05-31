import { fetchAlerts } from "@/lib/alerts/alertsEngine";
import { getBilletsAvion } from "@/lib/supabase/queries";

/** Badges menu latéral — requêtes légères (sans loadDashboardV2). */
export async function loadNavBadges(): Promise<Record<string, number>> {
  const [alerts, billets] = await Promise.all([
    fetchAlerts(),
    getBilletsAvion(),
  ]);

  const billetsEnAttente = billets.filter((b) => b.statut === "demande").length;
  const hebergementAlerts = alerts.filter(
    (a) => !a.lu && a.message.toLowerCase().includes("hébergement")
  ).length;
  const rapportsBadge = alerts.some(
    (a) => !a.lu && a.message.toLowerCase().includes("rapport")
  )
    ? 1
    : 0;

  return {
    "/v2/hebergement": hebergementAlerts,
    "/v2/billets-avion": billetsEnAttente,
    "/v2/rapports": rapportsBadge,
  };
}

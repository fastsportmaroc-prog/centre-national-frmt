import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";
import { getAnalyticsDashboard } from "@/lib/data/analytics";

export default async function StatistiquesPage() {
  const data = await getAnalyticsDashboard();
  return <AnalyticsClient data={data} />;
}

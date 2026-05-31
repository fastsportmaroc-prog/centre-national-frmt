import { StageDetailV2Client } from "@/components/v2/stages/StageDetailV2Client";

export const dynamic = "force-dynamic";

export default async function StageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StageDetailV2Client id={decodeURIComponent(id)} />;
}
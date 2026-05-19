import { StageDetailClient } from "@/components/stages/StageDetailClient";

type Props = { params: Promise<{ id: string }> };

export default async function StageDetailPage({ params }: Props) {
  const { id } = await params;
  return <StageDetailClient id={id} />;
}

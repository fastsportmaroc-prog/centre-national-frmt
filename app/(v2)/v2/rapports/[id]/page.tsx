import { RapportDetailClient } from "@/components/v2/rapports/RapportDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RapportDetailPage({ params }: Props) {
  const { id } = await params;
  return <RapportDetailClient reportId={id} />;
}

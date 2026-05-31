import { EntraineurProfilV2Client } from "@/components/v2/entraineurs/EntraineurProfilV2Client";

export default async function EntraineurProfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EntraineurProfilV2Client id={id} />;
}

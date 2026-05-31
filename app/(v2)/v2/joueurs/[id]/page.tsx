import { JoueurProfilV2Client } from "@/components/v2/joueurs/JoueurProfilV2Client";

export default async function JoueurProfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JoueurProfilV2Client id={id} />;
}

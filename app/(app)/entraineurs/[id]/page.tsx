import { EntraineurFicheClient } from "@/components/entraineurs/EntraineurFicheClient";

type Props = { params: Promise<{ id: string }> };

export default async function EntraineurFichePage({ params }: Props) {
  const { id } = await params;
  return <EntraineurFicheClient id={id} />;
}

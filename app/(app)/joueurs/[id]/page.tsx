import { JoueurFicheClient } from "@/components/joueurs/JoueurFicheClient";

type Props = { params: Promise<{ id: string }> };

export default async function JoueurFichePage({ params }: Props) {
  const { id } = await params;
  return <JoueurFicheClient id={id} />;
}

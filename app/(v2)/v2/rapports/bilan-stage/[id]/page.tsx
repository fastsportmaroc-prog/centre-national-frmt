import { BilanStageClient } from "@/components/v2/rapports/BilanStageClient";

export default async function V2RapportBilanStagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BilanStageClient stageId={id} />;
}


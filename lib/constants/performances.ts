import type { CircuitType } from "@/lib/types/performances";

export const CIRCUIT_LABELS: Record<CircuitType, string> = {
  atp: "ATP",
  wta: "WTA",
  itf_pro: "ITF Pro",
  itf_junior: "ITF Juniors",
  futures: "Futures",
  challenger: "Challenger",
};

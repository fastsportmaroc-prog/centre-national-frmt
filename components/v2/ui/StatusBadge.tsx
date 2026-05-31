import { statutBadgeClass } from "@/lib/v2/status-styles";
import { cn } from "@/lib/utils/cn";

export function StatusBadge({ statut, className }: { statut: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        statutBadgeClass(statut),
        className
      )}
    >
      {statut.replace(/_/g, " ")}
    </span>
  );
}

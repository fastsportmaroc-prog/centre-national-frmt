import {
  PROGRAMMATION_TYPE_COLORS,
  PROGRAMMATION_TYPE_LABELS,
} from "@/lib/constants/programmation-joueurs";
import type { ProgrammationType } from "@/lib/types/programmation-joueurs";
import { cn } from "@/lib/utils/cn";

type Props = {
  type: ProgrammationType;
  className?: string;
  compact?: boolean;
};

export function BadgeTypeEvenement({ type, className, compact }: Props) {
  const colors = PROGRAMMATION_TYPE_COLORS[type];
  const label = PROGRAMMATION_TYPE_LABELS[type];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-medium",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className
      )}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      {label}
    </span>
  );
}

import { cn } from "@/lib/utils/cn";

type Props = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "h-10 w-10 text-[8px]",
  md: "h-14 w-14 text-[9px]",
  lg: "h-20 w-20 text-[10px]",
};

/** Zone réservée — logo officiel FRMT à intégrer plus tard */
export function LogoPlaceholder({ size = "md", className }: Props) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border border-dashed border-frmt-green/40 bg-surface-elevated/80 text-center font-medium uppercase tracking-wide text-muted",
        sizes[size],
        className
      )}
      title="Logo officiel à intégrer"
    >
      Logo
      <br />
      FRMT
    </div>
  );
}

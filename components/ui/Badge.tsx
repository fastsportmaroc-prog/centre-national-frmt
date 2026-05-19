import { cn } from "@/lib/utils/cn";

type Props = {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "muted" | "danger";
  className?: string;
};

const variants = {
  default: "bg-tennis/15 text-tennis border-tennis/30",
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  muted: "bg-zinc-800 text-muted border-border",
  danger: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function Badge({ children, variant = "default", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

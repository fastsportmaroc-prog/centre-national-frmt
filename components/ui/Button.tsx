import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
};

const variants: Record<Variant, string> = {
  primary:
    "bg-frmt-green text-white hover:bg-frmt-green/90 font-semibold shadow-sm shadow-frmt-green/20",
  secondary:
    "bg-surface-elevated border border-border text-foreground hover:bg-zinc-800",
  ghost: "text-muted hover:text-foreground hover:bg-surface-elevated",
  danger: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

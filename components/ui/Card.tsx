import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  premium,
  ...props
}: HTMLAttributes<HTMLDivElement> & { premium?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-5",
        premium && "card-premium",
        className
      )}
      {...props}
    />
  );
}

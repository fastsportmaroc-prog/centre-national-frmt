import { cn } from "@/lib/utils/cn";

type Props = {
  className?: string;
};

export function Skeleton({ className }: Props) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-surface-elevated/80",
        className
      )}
      aria-hidden
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

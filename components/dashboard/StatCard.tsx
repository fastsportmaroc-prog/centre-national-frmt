import { Card } from "@/components/ui/Card";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, hint, icon: Icon }: Props) {
  return (
    <Card premium className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="rounded-lg bg-frmt-green/15 p-2">
          <Icon className="h-4 w-4 text-frmt-green" />
        </span>
      </div>
      <p className="text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Card>
  );
}

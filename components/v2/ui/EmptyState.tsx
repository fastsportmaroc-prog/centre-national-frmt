import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: Props) {
  return (
    <Card className="card-premium flex flex-col items-center gap-4 p-10 text-center">
      <div className="rounded-full bg-[color:var(--frmt-navy)]/30 p-4">
        <Icon className="h-10 w-10 text-[color:var(--frmt-gold)]" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-muted">{description}</p>
      </div>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </Card>
  );
}

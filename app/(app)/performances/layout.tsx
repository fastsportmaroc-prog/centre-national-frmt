import { Card } from "@/components/ui/Card";

const MSG =
  "Fonctionnalité désactivée temporairement — en attente de validation locale.";

export default function PerformancesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Card className="border-amber-500/30 bg-amber-500/10 p-6 text-center">
        <p className="font-medium text-amber-200">Performances internationales</p>
        <p className="mt-2 text-sm text-muted">{MSG}</p>
      </Card>
      <div className="hidden">{children}</div>
    </div>
  );
}

import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function AccessDenied() {
  return (
    <Card className="mx-auto mt-12 max-w-md p-8 text-center">
      <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-amber-500" />
      <h2 className="text-lg font-semibold">Accès non autorisé</h2>
      <p className="mt-2 text-sm text-muted">
        Vous n&apos;avez pas les droits nécessaires pour consulter cette rubrique. Contactez un
        administrateur FRMT si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
      </p>
    </Card>
  );
}

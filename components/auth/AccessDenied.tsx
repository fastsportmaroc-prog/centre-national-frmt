import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function AccessDenied() {
  return (
    <Card className="mx-auto mt-12 max-w-md p-8 text-center">
      <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-amber-500" />
      <h2 className="text-lg font-semibold">Accès refusé</h2>
      <p className="mt-2 text-sm text-muted">
        Votre rôle ne permet pas d&apos;accéder à cette section. Contactez un administrateur FRMT.
      </p>
    </Card>
  );
}

import Link from "next/link";
import { V2PageHeader } from "@/components/v2/V2PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function V2BudgetAdminPage() {
  return (
    <>
      <V2PageHeader title="Budget administration" />
      <main className="p-4 sm:p-6">
        <Card className="space-y-3 p-4">
          <p className="text-sm text-muted">
            Accès aux prévisionnels et déplacements du module budget existant.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/v2/budget">
              <Button>Budget principal</Button>
            </Link>
            <Link href="/budget/previsionnels">
              <Button variant="secondary">Prévisionnels (v1)</Button>
            </Link>
            <Link href="/budget/deplacements">
              <Button variant="secondary">Déplacements (v1)</Button>
            </Link>
          </div>
        </Card>
      </main>
    </>
  );
}

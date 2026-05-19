import { PageHeader } from "@/components/layout/PageHeader";
import { ParametresDemoRole } from "@/components/parametres/ParametresDemoRole";
import { Card } from "@/components/ui/Card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ParametresPage() {
  const supabaseOk = isSupabaseConfigured();

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Configuration de l'application"
      />
      <main className="flex-1 space-y-4 p-4 sm:p-6">
        <ParametresDemoRole />
        <Card>
          <h2 className="font-semibold">Connexion Supabase</h2>
          <p className="mt-2 text-sm text-muted">
            {supabaseOk
              ? "Supabase est configuré. Auth, base de données et storage actifs."
              : "Supabase non configuré — ajoutez les variables dans .env.local."}
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Authentification</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted">
            <li>Email / mot de passe via Supabase Auth</li>
            <li>Rôles : admin, staff + frmt_role (directeur, entraineur, logisticien…)</li>
            <li>Page admin réservée aux administrateurs</li>
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">Storage photos</h2>
          <p className="mt-2 text-sm text-muted">
            Bucket <code className="text-tennis">joueurs-photos</code> — JPG, PNG, WebP, max 2 Mo.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Variables (.env.local)</h2>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-surface-elevated p-3 text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000`}
          </pre>
        </Card>
      </main>
    </>
  );
}
